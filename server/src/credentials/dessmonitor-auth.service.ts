import { createHash } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as qs from 'qs';
import { firstValueFrom } from 'rxjs';

export const DESS_DEFAULT_BASE_URL = 'https://web.dessmonitor.com/public/';

function sha1(s: string): string {
  return createHash('sha1').update(s, 'utf8').digest('hex');
}

/** Matches dessmonitor request.js transferUriStr encoding. */
function transferUriStr(obj: Record<string, unknown>): string {
  return qs
    .stringify(obj)
    .replace(/%20/g, '+')
    .replace(/%2B/g, '+')
    .replace(/%3A/g, ':')
    .replace(/%2C/g, ',')
    .replace(/%40/g, '@')
    .replace(/%24/g, '$')
    .replace(/%26/g, '&')
    .replace(/%3D/g, '=')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

interface AuthSourceResponse {
  err: number;
  desc?: string;
  dat?: { token?: string; secret?: string; [k: string]: unknown };
}

interface DeviceItem {
  pn?: string;
  sn?: string;
  devaddr?: number;
  devcode?: number;
  devalias?: string;
  [k: string]: unknown;
}

interface WebQueryDeviceEsResponse {
  err: number;
  desc?: string;
  dat?: { total?: number; device?: DeviceItem[]; [k: string]: unknown };
}

export interface LoginResult {
  token: string;
  secret: string;
  baseUrl: string;
}

@Injectable()
export class DessmonitorAuthService {
  private readonly logger = new Logger(DessmonitorAuthService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Login with email (usr) and password.
   * Calls authSource and returns token + secret for subsequent requests.
   */
  async login(
    usr: string,
    pwd: string,
    companyKey: string,
    baseUrl = DESS_DEFAULT_BASE_URL,
  ): Promise<LoginResult> {
    const salt = Date.now();
    const pwdSha1 = sha1(pwd);
    const params: Record<string, string | number> = {
      action: 'authSource',
      usr,
      source: 1,
      'company-key': companyKey,
    };
    const uriStr = transferUriStr(params as Record<string, unknown>);
    const signStr = `${salt}${pwdSha1}&${uriStr}`;
    const sign = sha1(signStr);
    const queryParams = transferUriStr({ sign, salt, ...params } as Record<string, unknown>);
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${base}?${queryParams}`;

    this.logger.debug('login: calling authSource');
    const { data } = await firstValueFrom(
      this.httpService.get<AuthSourceResponse>(url, { timeout: 15000 }),
    );

    if (data.err !== 0) {
      const msg = data.desc ?? `err=${data.err}`;
      this.logger.warn(`login failed: ${msg}`);
      throw new Error(msg);
    }

    const dat = data.dat;
    const token = dat?.token;
    const secret = dat?.secret;
    if (!token || !secret) {
      this.logger.warn('login: response missing token or secret');
      throw new Error('Invalid auth response: missing token or secret');
    }

    this.logger.log('login: success');
    return { token, secret, baseUrl };
  }

  /**
   * Fetch user's devices via webQueryDeviceEs.
   * Returns first device (pn, sn, devcode, devaddr) for chart/latest APIs.
   */
  async getDevices(
    token: string,
    secret: string,
    baseUrl = DESS_DEFAULT_BASE_URL,
  ): Promise<{ pn: string; sn: string; devcode: string; devaddr: string }[]> {
    const url = this.buildUrl(baseUrl, 'webQueryDeviceEs', token, secret, {
      devtype: '2304',
      page: '0',
      pagesize: '15',
    });
    this.logger.debug('getDevices: calling webQueryDeviceEs');
    const { data } = await firstValueFrom(
      this.httpService.get<WebQueryDeviceEsResponse>(url, { timeout: 15000 }),
    );
    if (data.err !== 0) {
      throw new Error(data.desc ?? `webQueryDeviceEs err=${data.err}`);
    }
    const devices = data.dat?.device ?? [];
    return devices
      .map((d) => ({
        pn: String(d.pn ?? ''),
        sn: String(d.sn ?? ''),
        devcode: String(d.devcode ?? ''),
        devaddr: String(d.devaddr ?? ''),
        devalias: typeof d.devalias === 'string' ? d.devalias : undefined,
      }))
      .filter((d) => d.pn && d.sn);
  }

  /**
   * Canonical param order for sign (matches web.dessmonitor.com).
   * Sign is sensitive to param order; server verifies against this order.
   */
  private static readonly SIGN_PARAM_ORDER = [
    'action',
    'source',
    'pn',
    'devcode',
    'sn',
    'devaddr',
    'field',
    'precision',
    'sdate',
    'edate',
    'i18n',
    'chartStatus',
    'parameter',
    'date',
    'devtype',
    'page',
    'pagesize',
  ] as const;

  /**
   * Build signed query params for an authenticated request.
   * Use token + secret from login.
   */
  buildSignedParams(
    action: string,
    token: string,
    secret: string,
    extraParams: Record<string, string> = {},
  ): Record<string, string> {
    const salt = Date.now();
    const all: Record<string, string> = {
      action,
      source: '1',
      ...extraParams,
    };
    for (const k of Object.keys(all)) {
      if (all[k] == null || all[k] === '') delete all[k];
    }
    // Build params in canonical order for sign (order affects signature)
    const ordered: Record<string, string> = {};
    for (const k of DessmonitorAuthService.SIGN_PARAM_ORDER) {
      if (all[k] != null && all[k] !== '') ordered[k] = all[k];
    }
    for (const k of Object.keys(all)) {
      if (!(k in ordered)) ordered[k] = all[k];
    }
    const uriStr = qs.stringify(ordered);
    const signStr = `${salt}${secret}${token}&${uriStr}`;
    const sign = sha1(signStr);
    const result: Record<string, string> = { sign, salt: String(salt), token };
    for (const k of DessmonitorAuthService.SIGN_PARAM_ORDER) {
      if (all[k] != null && all[k] !== '') result[k] = all[k];
    }
    for (const k of Object.keys(all)) {
      if (!(k in result)) result[k] = all[k];
    }
    return result;
  }

  /**
   * Build full URL for an authenticated request.
   */
  buildUrl(
    baseUrl: string,
    action: string,
    token: string,
    secret: string,
    extraParams: Record<string, string> = {},
  ): string {
    const params = this.buildSignedParams(action, token, secret, extraParams);
    const query = qs.stringify(params);
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${base}?${query}`;
  }
}

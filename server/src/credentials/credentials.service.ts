import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { DESS_DEFAULT_BASE_URL, DessmonitorAuthService } from './dessmonitor-auth.service';

export interface DeviceRecord {
  pn: string;
  sn: string;
  devcode: string;
  devaddr: string;
  devalias?: string;
}

export interface StoredCredentials {
  url: string;
  params: Record<string, string>;
  baseUrl: string;
  updatedAt: string;
}

const CREDENTIALS_DIR = 'data';
const CREDENTIALS_FILE = 'credentials.json';

@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);
  private dataDir: string;

  constructor(
    private readonly authService: DessmonitorAuthService,
    private readonly dbService: DatabaseService,
  ) {
    this.dataDir = join(process.cwd(), CREDENTIALS_DIR);
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(): string {
    return join(this.dataDir, CREDENTIALS_FILE);
  }

  private readonly defaultBaseUrl = DESS_DEFAULT_BASE_URL;

  getCredentials(): StoredCredentials | null {
    const path = this.getFilePath();
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, 'utf-8');
      return JSON.parse(raw) as StoredCredentials;
    } catch {
      return null;
    }
  }

  clearCredentials(): void {
    const path = this.getFilePath();
    if (existsSync(path)) unlinkSync(path);
    void this.dbService.run('DELETE FROM devices');
  }

  /** Get user devices from DB. */
  async getDevices(): Promise<DeviceRecord[]> {
    return this.getDevicesFromDb();
  }

  /** Fetch devices from API (refresh) and save to DB. */
  async refreshDevices(): Promise<DeviceRecord[]> {
    const creds = this.getCredentials();
    if (!creds?.params?.token || !creds?.params?.secret) return [];
    const devices = await this.authService.getDevices(
      creds.params.token,
      creds.params.secret,
      creds.baseUrl,
    );
    await this.saveDevices(devices);
    return devices;
  }

  /** Get a single device by pn. Uses (pn, sn) as lookup - returns first match by pn. */
  async getDeviceByPn(pn: string): Promise<DeviceRecord | null> {
    if (!pn?.trim()) return null;
    const row = await this.dbService.get<{
      pn: string;
      sn: string;
      devcode: string;
      devaddr: string;
      devalias: string | null;
    }>('SELECT pn, sn, devcode, devaddr, devalias FROM devices WHERE pn = ? LIMIT 1', [pn.trim()]);
    if (!row) return null;
    return {
      pn: row.pn,
      sn: row.sn,
      devcode: row.devcode,
      devaddr: row.devaddr,
      devalias: row.devalias ?? undefined,
    };
  }

  async getDevicesFromDb(): Promise<DeviceRecord[]> {
    const rows = await this.dbService.all<{
      pn: string;
      sn: string;
      devcode: string;
      devaddr: string;
      devalias: string | null;
    }>('SELECT pn, sn, devcode, devaddr, devalias FROM devices ORDER BY pn, sn');
    return rows.map((r) => ({
      pn: r.pn,
      sn: r.sn,
      devcode: r.devcode,
      devaddr: r.devaddr,
      devalias: r.devalias ?? undefined,
    }));
  }

  async saveDevices(devices: DeviceRecord[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.dbService.transaction(async () => {
      await this.dbService.run('DELETE FROM devices');
      for (const d of devices) {
        await this.dbService.run(
          'INSERT INTO devices (pn, sn, devcode, devaddr, devalias, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [d.pn, d.sn, d.devcode, d.devaddr, d.devalias ?? null, now],
        );
      }
    });
  }

  /** Update device params (pn, sn, devcode, devaddr) on existing credentials. */
  updateDeviceParams(params: {
    pn?: string;
    sn?: string;
    devcode?: string;
    devaddr?: string;
  }): StoredCredentials | null {
    const creds = this.getCredentials();
    if (!creds) return null;
    const next = { ...creds.params };
    if (params.pn != null) next.pn = params.pn;
    if (params.sn != null) next.sn = params.sn;
    if (params.devcode != null) next.devcode = params.devcode;
    if (params.devaddr != null) next.devaddr = params.devaddr;
    const stored: StoredCredentials = {
      ...creds,
      params: next,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.getFilePath(), JSON.stringify(stored, null, 2), 'utf-8');
    return stored;
  }

  /** Whether env vars for auto-login are set (DESS_USR, DESS_PWD, DESS_COMPANY_KEY). */
  hasEnvCredentials(): boolean {
    const usr = process.env.DESS_USR;
    const pwd = process.env.DESS_PWD;
    const companyKey = process.env.DESS_COMPANY_KEY;
    return !!(usr && pwd && companyKey);
  }

  /**
   * Relogin from env and overwrite stored credentials. Use on auth errors when env creds exist.
   * Preserves device params (pn, sn, etc.) from existing creds; only refreshes token/secret.
   */
  async reloginFromEnv(): Promise<boolean> {
    if (!this.hasEnvCredentials()) return false;
    const usr = process.env.DESS_USR!;
    const pwd = process.env.DESS_PWD!;
    const companyKey = process.env.DESS_COMPANY_KEY!;
    try {
      const { token, secret, baseUrl } = await this.authService.login(usr, pwd, companyKey);
      const creds = this.getCredentials();
      let extraParams: Record<string, string> = {};
      if (creds?.params) {
        const { pn, sn, devcode, devaddr } = creds.params;
        if (pn) extraParams.pn = pn;
        if (sn) extraParams.sn = sn;
        if (devcode) extraParams.devcode = devcode;
        if (devaddr) extraParams.devaddr = devaddr;
      }
      if (Object.keys(extraParams).length === 0) {
        const pn = process.env.DESS_PN;
        const sn = process.env.DESS_SN;
        const devcode = process.env.DESS_DEVCODE;
        const devaddr = process.env.DESS_DEVADDR;
        if (pn) extraParams.pn = pn;
        if (sn) extraParams.sn = sn;
        if (devcode) extraParams.devcode = devcode;
        if (devaddr) extraParams.devaddr = devaddr;
      }
      if (Object.keys(extraParams).length === 0) {
        try {
          const devices = await this.authService.getDevices(token, secret, baseUrl);
          await this.saveDevices(devices);
          const first = devices[0];
          if (first) extraParams = first;
        } catch (e) {
          this.logger.debug(
            `reloginFromEnv getDevices skipped: ${e instanceof Error ? e.message : e}`,
          );
        }
      }
      this.storeFromLogin(
        token,
        secret,
        baseUrl,
        Object.keys(extraParams).length > 0 ? extraParams : undefined,
      );
      this.logger.log('Relogin from env: credentials refreshed');
      return true;
    } catch (e) {
      this.logger.warn(`Relogin from env failed: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  /**
   * If DESS_USR, DESS_PWD, DESS_COMPANY_KEY env vars are set and no credentials exist,
   * login and store. Call on startup for Docker / .env flow.
   * Optional DESS_PN, DESS_SN, DESS_DEVCODE, DESS_DEVADDR for device-specific APIs (chart, etc.).
   */
  async ensureCredentialsFromEnv(): Promise<void> {
    if (this.getCredentials()) return;
    const usr = process.env.DESS_USR;
    const pwd = process.env.DESS_PWD;
    const companyKey = process.env.DESS_COMPANY_KEY;
    if (!usr || !pwd || !companyKey) return;
    try {
      const { token, secret, baseUrl } = await this.authService.login(usr, pwd, companyKey);
      let extraParams: Record<string, string> = {};
      const pn = process.env.DESS_PN;
      const sn = process.env.DESS_SN;
      const devcode = process.env.DESS_DEVCODE;
      const devaddr = process.env.DESS_DEVADDR;
      if (pn) extraParams.pn = pn;
      if (sn) extraParams.sn = sn;
      if (devcode) extraParams.devcode = devcode;
      if (devaddr) extraParams.devaddr = devaddr;
      if (Object.keys(extraParams).length === 0) {
        try {
          const devices = await this.authService.getDevices(token, secret, baseUrl);
          await this.saveDevices(devices);
          const first = devices[0];
          if (first) {
            extraParams = first;
            this.logger.log(`Device params from webQueryDeviceEs: pn=${first.pn}`);
          }
        } catch (e) {
          this.logger.debug(`getDevices skipped: ${e instanceof Error ? e.message : e}`);
        }
      }
      this.storeFromLogin(
        token,
        secret,
        baseUrl,
        Object.keys(extraParams).length > 0 ? extraParams : undefined,
      );
      this.logger.log('Credentials loaded from .env');
    } catch (e) {
      this.logger.warn(`Failed to login from env: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Store credentials from login (email + password flow). */
  storeFromLogin(
    token: string,
    secret: string,
    baseUrl = this.defaultBaseUrl,
    extraParams?: Record<string, string>,
  ): StoredCredentials {
    const params: Record<string, string> = {
      token,
      secret,
      source: '1',
      ...extraParams,
    };
    for (const k of Object.keys(params)) {
      if (params[k] == null || params[k] === '') delete params[k];
    }
    const stored: StoredCredentials = {
      url: `${baseUrl}?token=...`,
      params,
      baseUrl,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.getFilePath(), JSON.stringify(stored, null, 2), 'utf-8');
    return stored;
  }

  /** Parameter order for legacy URL-based credentials (sign/salt/token from pasted URL). */
  private readonly legacyParamOrder = [
    'sign',
    'salt',
    'token',
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
  ] as const;

  private readonly extraParamKeys = [
    'pn',
    'sn',
    'devcode',
    'devaddr',
    'field',
    'precision',
    'sdate',
    'edate',
    'i18n',
    'chartStatus',
    'parameter',
    'date',
  ] as const;

  /**
   * Build authenticated URL for an action.
   * When devicePn is provided, looks up device in DB and uses its params (pn, sn, devcode, devaddr).
   * When token + secret exist (from login), uses DessmonitorAuthService for fresh sign/salt.
   * When only legacy params exist (from pasted URL), reuses stored sign/salt/token.
   */
  async buildUrl(
    action: string,
    extraParams?: Record<string, string>,
    devicePn?: string,
  ): Promise<string | null> {
    const creds = this.getCredentials();
    if (!creds) return null;

    const { token, secret } = creds.params;
    let deviceParams: Record<string, string> = creds.params;

    if (devicePn) {
      const device = await this.getDeviceByPn(devicePn);
      if (device) {
        deviceParams = {
          ...deviceParams,
          pn: device.pn,
          sn: device.sn,
          devcode: device.devcode,
          devaddr: device.devaddr,
        };
      }
    }

    // Token + secret: delegate to DessmonitorAuthService for fresh sign/salt per request
    if (token && secret) {
      const merged = { ...extraParams } as Record<string, string>;
      for (const k of this.extraParamKeys) {
        const v = deviceParams[k];
        if (v != null && v !== '') merged[k] ??= v;
      }
      return this.authService.buildUrl(creds.baseUrl, action, token, secret, merged);
    }

    // Legacy: stored sign/salt/token from pasted URL (no secret)
    const all: Record<string, string> = { ...deviceParams, action, ...extraParams };
    const pairs: string[] = [];
    for (const key of this.legacyParamOrder) {
      const v = all[key];
      if (v != null && v !== '') {
        pairs.push(`${key}=${encodeURIComponent(v)}`);
      }
    }
    const query = pairs.join('&');
    const base = creds.baseUrl.endsWith('/') ? creds.baseUrl : `${creds.baseUrl}/`;
    return `${base}?${query}`;
  }
}

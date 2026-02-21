import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { DessmonitorAuthService } from './dessmonitor-auth.service';

export interface LoginBody {
  usr: string;
  pwd: string;
  companyKey: string;
  baseUrl?: string;
  /** Device params for chart/latest APIs (get from dessmonitor Network tab) */
  pn?: string;
  sn?: string;
  devcode?: string;
  devaddr?: string;
}

@Controller('credentials')
export class CredentialsController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly authService: DessmonitorAuthService,
  ) {}

  /**
   * Login with email (usr) and password.
   * Stores token + secret for subsequent API calls.
   * Falls back to DESS_USR, DESS_PWD, DESS_COMPANY_KEY from env when body is empty.
   */
  @Post('login')
  async login(@Body() body: LoginBody) {
    const usr = body.usr || process.env.DESS_USR;
    const pwd = body.pwd || process.env.DESS_PWD;
    const companyKey = body.companyKey || process.env.DESS_COMPANY_KEY;
    const baseUrl = body.baseUrl;
    if (!usr || !pwd || !companyKey) {
      return {
        ok: false,
        error:
          'Provide usr (email), pwd (password), and companyKey, or set DESS_USR, DESS_PWD, DESS_COMPANY_KEY in .env',
      };
    }
    try {
      const {
        token,
        secret,
        baseUrl: resolvedBaseUrl,
      } = await this.authService.login(usr, pwd, companyKey, baseUrl ?? undefined);
      let extraParams: Record<string, string> = {};
      if (body.pn) extraParams.pn = body.pn;
      if (body.sn) extraParams.sn = body.sn;
      if (body.devcode) extraParams.devcode = body.devcode;
      if (body.devaddr) extraParams.devaddr = body.devaddr;
      try {
        const devices = await this.authService.getDevices(token, secret, resolvedBaseUrl);
        await this.credentialsService.saveDevices(devices);
        if (Object.keys(extraParams).length === 0) {
          const first = devices[0];
          if (first) extraParams = first;
        }
      } catch {
        // ignore – use explicit params or leave extraParams empty
      }
      this.credentialsService.storeFromLogin(
        token,
        secret,
        resolvedBaseUrl,
        Object.keys(extraParams).length > 0 ? extraParams : undefined,
      );
      return {
        ok: true,
        message: 'Login successful. Credentials stored for API requests.',
        updatedAt: this.credentialsService.getCredentials()?.updatedAt ?? null,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Login failed',
      };
    }
  }

  @Patch('device-params')
  updateDeviceParams(
    @Body() body: { pn?: string; sn?: string; devcode?: string; devaddr?: string },
  ) {
    const updated = this.credentialsService.updateDeviceParams(body);
    if (!updated) {
      return { ok: false, error: 'No credentials. Login first.' };
    }
    return {
      ok: true,
      message: 'Device params updated. Chart/latest APIs will use them.',
      updatedAt: updated.updatedAt,
    };
  }

  @Delete()
  clearCredentials() {
    try {
      this.credentialsService.clearCredentials();
      return { ok: true, message: 'Credentials cleared' };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to clear credentials',
      };
    }
  }

  @Get('devices')
  async getDevices() {
    try {
      const devices = await this.credentialsService.getDevices();
      return { ok: true, devices };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to fetch devices',
        devices: [],
      };
    }
  }

  @Post('devices/refresh')
  async refreshDevices() {
    try {
      const devices = await this.credentialsService.refreshDevices();
      return { ok: true, devices };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to refresh devices',
        devices: [],
      };
    }
  }

  @Get('device-params')
  getDeviceParams() {
    const creds = this.credentialsService.getCredentials();
    if (!creds) return { configured: false, pn: null, sn: null, devcode: null, devaddr: null };
    const { pn, sn, devcode, devaddr } = creds.params;
    return {
      configured: true,
      pn: pn ?? null,
      sn: sn ?? null,
      devcode: devcode ?? null,
      devaddr: devaddr ?? null,
    };
  }

  @Get('status')
  status() {
    const creds = this.credentialsService.getCredentials();
    return {
      configured: !!creds,
      updatedAt: creds?.updatedAt ?? null,
    };
  }
}

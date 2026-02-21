import { Controller, Delete, Get, Query } from '@nestjs/common';
import type { CredentialsService } from './credentials.service';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  saveCredentials(@Query() query: Record<string, string>) {
    const url = query.url;
    const hasUrl = url && typeof url === 'string';
    const hasParams = query.sign || query.token || query.pn || query.sn;
    if (!hasUrl && !hasParams) {
      return {
        ok: false,
        error:
          'Provide url (URL-encoded full URL) or individual params: sign, salt, token, pn, sn, source, devcode, devaddr, i18n',
      };
    }
    try {
      const stored = this.credentialsService.parseAndStore(url ?? '', query);
      return {
        ok: true,
        message: 'Credentials saved. Data fetching will start shortly.',
        updatedAt: stored.updatedAt,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Failed to save credentials',
      };
    }
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

  @Get('status')
  status() {
    const creds = this.credentialsService.getCredentials();
    return {
      configured: !!creds,
      updatedAt: creds?.updatedAt ?? null,
    };
  }
}

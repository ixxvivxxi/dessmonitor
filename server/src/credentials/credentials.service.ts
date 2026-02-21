import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

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
  private dataDir: string;

  constructor() {
    this.dataDir = join(process.cwd(), CREDENTIALS_DIR);
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(): string {
    return join(this.dataDir, CREDENTIALS_FILE);
  }

  private readonly keptParams = new Set([
    'sign',
    'salt',
    'token',
    'pn',
    'sn',
    'source',
    'devcode',
    'devaddr',
    'i18n',
  ]);

  private readonly defaultBaseUrl = 'https://web.dessmonitor.com/public/';

  parseAndStore(
    url: string,
    queryParams?: Record<string, string>,
  ): StoredCredentials {
    const params: Record<string, string> = {};
    let baseUrl = this.defaultBaseUrl;

    if (url && url.startsWith('http')) {
      try {
        const parsed = new URL(url);
        baseUrl = `${parsed.origin}${parsed.pathname}`;
        parsed.searchParams.forEach((value, key) => {
          if (this.keptParams.has(key)) params[key] = value;
        });
      } catch {
        // URL invalid, fall through to queryParams
      }
    }

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value != null && value !== '' && this.keptParams.has(key)) {
          params[key] = String(value);
        }
      }
    }

    const stored: StoredCredentials = {
      url: url || `${baseUrl}?${new URLSearchParams(params).toString()}`,
      params,
      baseUrl,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.getFilePath(), JSON.stringify(stored, null, 2), 'utf-8');
    return stored;
  }

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
  }

  buildUrl(
    action: string,
    extraParams?: Record<string, string>,
  ): string | null {
    const creds = this.getCredentials();
    if (!creds) return null;
    const params = new URLSearchParams(creds.params);
    params.set('action', action);
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        params.set(k, v);
      }
    }
    return `${creds.baseUrl}?${params.toString()}`;
  }
}

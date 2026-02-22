import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { Test, type TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../db/database.service';
import { CredentialsService } from './credentials.service';
import { DessmonitorAuthService } from './dessmonitor-auth.service';

jest.mock('../db/database.service', () => ({
  DatabaseService: jest.fn(),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('CredentialsService', () => {
  let service: CredentialsService;
  let authService: { login: jest.Mock; getDevices: jest.Mock; buildUrl: jest.Mock };
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
  const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    (mkdirSync as jest.Mock).mockImplementation(() => {});

    const authMock = {
      login: jest.fn(),
      getDevices: jest.fn(),
      buildUrl: jest.fn(),
    };
    const dbMock = {
      get: jest.fn(),
      all: jest.fn().mockResolvedValue([]),
      run: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((fn: (t: unknown) => Promise<void>) => fn(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: DessmonitorAuthService, useValue: authMock },
        { provide: DatabaseService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    authService = authMock;
  });

  describe('hasEnvCredentials', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
      process.env.DESS_USR = undefined;
      process.env.DESS_PWD = undefined;
      process.env.DESS_COMPANY_KEY = undefined;
    });

    afterEach(() => {
      process.env = origEnv;
    });

    it('returns false when env vars are missing', () => {
      expect(service.hasEnvCredentials()).toBe(false);
    });

    it('returns false when only some env vars are set', () => {
      process.env.DESS_USR = 'a@b.com';
      process.env.DESS_PWD = 'secret';
      expect(service.hasEnvCredentials()).toBe(false);
    });

    it('returns true when all three env vars are set', () => {
      process.env.DESS_USR = 'a@b.com';
      process.env.DESS_PWD = 'secret';
      process.env.DESS_COMPANY_KEY = 'key';
      expect(service.hasEnvCredentials()).toBe(true);
    });
  });

  describe('storeFromLogin', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it('writes credentials to file with token and secret', () => {
      const result = service.storeFromLogin('tok', 'sec', 'https://base/');

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const [path, content] = mockWriteFileSync.mock.calls[0];
      expect(path).toContain('credentials.json');
      const stored = JSON.parse(content) as Record<string, unknown>;
      expect(stored.params).toMatchObject({ token: 'tok', secret: 'sec', source: '1' });
      expect(stored.baseUrl).toBe('https://base/');
      expect(result.updatedAt).toBeDefined();
    });

    it('includes extraParams when provided', () => {
      service.storeFromLogin('tok', 'sec', 'https://base/', { pn: 'P1', sn: 'S1' });

      const [, content] = mockWriteFileSync.mock.calls[0];
      const stored = JSON.parse(content) as Record<string, unknown>;
      expect(stored.params).toMatchObject({ pn: 'P1', sn: 'S1' });
    });
  });

  describe('getCredentials', () => {
    it('returns null when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      expect(service.getCredentials()).toBeNull();
    });

    it('returns parsed credentials when file exists', () => {
      mockExistsSync.mockReturnValue(true);
      const creds = {
        url: 'https://x?token=...',
        params: { token: 't', secret: 's' },
        baseUrl: 'https://x/',
        updatedAt: '2025-01-01T00:00:00Z',
      };
      mockReadFileSync.mockReturnValue(JSON.stringify(creds));

      expect(service.getCredentials()).toEqual(creds);
    });

    it('returns null on parse error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      expect(service.getCredentials()).toBeNull();
    });
  });

  describe('reloginFromEnv', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
      process.env.DESS_USR = undefined;
      process.env.DESS_PWD = undefined;
      process.env.DESS_COMPANY_KEY = undefined;
    });

    afterEach(() => {
      process.env = origEnv;
    });

    it('returns false when env credentials are not set', async () => {
      expect(await service.reloginFromEnv()).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('returns false when login fails', async () => {
      process.env.DESS_USR = 'a@b.com';
      process.env.DESS_PWD = 'pwd';
      process.env.DESS_COMPANY_KEY = 'key';
      authService.login.mockRejectedValue(new Error('Auth failed'));

      expect(await service.reloginFromEnv()).toBe(false);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('stores new credentials and returns true when login succeeds', async () => {
      process.env.DESS_USR = 'a@b.com';
      process.env.DESS_PWD = 'pwd';
      process.env.DESS_COMPANY_KEY = 'key';
      authService.login.mockResolvedValue({
        token: 'newToken',
        secret: 'newSecret',
        baseUrl: 'https://api/',
      });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          params: { token: 'old', secret: 'old', pn: 'P1', sn: 'S1' },
          baseUrl: 'https://api/',
        }),
      );

      const result = await service.reloginFromEnv();

      expect(result).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
      const [, content] = mockWriteFileSync.mock.calls[0];
      const stored = JSON.parse(content) as Record<string, unknown>;
      expect(stored.params).toMatchObject({
        token: 'newToken',
        secret: 'newSecret',
        pn: 'P1',
        sn: 'S1',
      });
    });
  });
});

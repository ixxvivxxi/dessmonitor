import { Test, type TestingModule } from '@nestjs/testing';
import { CredentialsController } from './credentials.controller';
import { CredentialsService } from './credentials.service';
import { DessmonitorAuthService } from './dessmonitor-auth.service';

describe('CredentialsController', () => {
  let controller: CredentialsController;
  let credentialsService: { getCredentials: jest.Mock; updateDeviceParams: jest.Mock };
  let authService: { login: jest.Mock; getDevices: jest.Mock };

  beforeEach(async () => {
    const credsMock = {
      getCredentials: jest.fn(),
      clearCredentials: jest.fn(),
      getDevices: jest.fn().mockResolvedValue([]),
      refreshDevices: jest.fn().mockResolvedValue([]),
      updateDeviceParams: jest.fn(),
      saveDevices: jest.fn().mockResolvedValue(undefined),
      storeFromLogin: jest.fn().mockReturnValue({ updatedAt: '2025-01-01T00:00:00Z' }),
    };
    const authMock = {
      login: jest.fn(),
      getDevices: jest.fn().mockResolvedValue([{ pn: 'P1', sn: 'S1', devcode: 'c', devaddr: 'a' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CredentialsController],
      providers: [
        { provide: CredentialsService, useValue: credsMock },
        { provide: DessmonitorAuthService, useValue: authMock },
      ],
    }).compile();

    controller = module.get<CredentialsController>(CredentialsController);
    credentialsService = credsMock as unknown as typeof credsMock;
    authService = authMock as unknown as typeof authMock;
  });

  describe('status', () => {
    it('returns configured false when no credentials', () => {
      credentialsService.getCredentials.mockReturnValue(null);

      expect(controller.status()).toEqual({ configured: false, updatedAt: null });
    });

    it('returns configured true with updatedAt when credentials exist', () => {
      credentialsService.getCredentials.mockReturnValue({
        updatedAt: '2025-02-01T12:00:00Z',
      });

      expect(controller.status()).toEqual({
        configured: true,
        updatedAt: '2025-02-01T12:00:00Z',
      });
    });
  });

  describe('login', () => {
    it('returns error when usr, pwd, companyKey are missing', async () => {
      const orig = { ...process.env };
      process.env.DESS_USR = '';
      process.env.DESS_PWD = '';
      process.env.DESS_COMPANY_KEY = '';

      const result = await controller.login({});

      expect(result).toMatchObject({
        ok: false,
        error: expect.stringContaining('Provide usr'),
      });
      expect(authService.login).not.toHaveBeenCalled();

      process.env.DESS_USR = orig.DESS_USR;
      process.env.DESS_PWD = orig.DESS_PWD;
      process.env.DESS_COMPANY_KEY = orig.DESS_COMPANY_KEY;
    });

    it('returns success when login succeeds with body params', async () => {
      authService.login.mockResolvedValue({
        token: 't',
        secret: 's',
        baseUrl: 'https://api/',
      });

      const result = await controller.login({
        usr: 'a@b.com',
        pwd: 'secret',
        companyKey: 'key',
      });

      expect(result).toMatchObject({ ok: true, message: expect.any(String) });
      expect(credentialsService.storeFromLogin).toHaveBeenCalledWith(
        't',
        's',
        'https://api/',
        expect.anything(),
      );
    });

    it('returns error when auth throws', async () => {
      authService.login.mockRejectedValue(new Error('Invalid password'));

      const result = await controller.login({
        usr: 'a@b.com',
        pwd: 'wrong',
        companyKey: 'key',
      });

      expect(result).toMatchObject({ ok: false, error: 'Invalid password' });
    });
  });

  describe('updateDeviceParams', () => {
    it('returns error when no credentials', () => {
      credentialsService.updateDeviceParams.mockReturnValue(null);

      expect(controller.updateDeviceParams({ pn: 'P1' })).toMatchObject({
        ok: false,
        error: 'No credentials. Login first.',
      });
    });

    it('returns success when params updated', () => {
      credentialsService.updateDeviceParams.mockReturnValue({
        updatedAt: '2025-02-01T12:00:00Z',
      });

      expect(controller.updateDeviceParams({ pn: 'P1' })).toMatchObject({
        ok: true,
        updatedAt: '2025-02-01T12:00:00Z',
      });
    });
  });

  describe('getDevices', () => {
    it('returns devices from service', async () => {
      const devices = [{ pn: 'P1', sn: 'S1', devcode: 'c', devaddr: 'a' }];
      credentialsService.getDevices.mockResolvedValue(devices);

      const result = await controller.getDevices();

      expect(result).toEqual({ ok: true, devices });
    });

    it('returns error and empty array on failure', async () => {
      credentialsService.getDevices.mockRejectedValue(new Error('DB error'));

      const result = await controller.getDevices();

      expect(result).toMatchObject({ ok: false, error: 'DB error', devices: [] });
    });
  });
});

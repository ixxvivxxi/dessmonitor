import { HttpService } from '@nestjs/axios';
import { Test, type TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { CredentialsService } from '../credentials/credentials.service';
import { DatabaseService } from '../db/database.service';
import { DessmonitorService } from './dessmonitor.service';

describe('DessmonitorService', () => {
  let service: DessmonitorService;
  let httpService: { get: jest.Mock };
  let credentialsService: {
    buildUrl: jest.Mock;
    hasEnvCredentials: jest.Mock;
    reloginFromEnv: jest.Mock;
  };
  let dbService: { run: jest.Mock; transaction: jest.Mock };

  beforeEach(async () => {
    const httpMock = {
      get: jest.fn(),
    };
    const credsMock = {
      buildUrl: jest.fn(),
      hasEnvCredentials: jest.fn().mockReturnValue(false),
      reloginFromEnv: jest.fn().mockResolvedValue(false),
    };
    const dbMock = {
      run: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((fn: (t: unknown) => Promise<void>) => fn(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DessmonitorService,
        { provide: HttpService, useValue: httpMock },
        { provide: CredentialsService, useValue: credsMock },
        { provide: DatabaseService, useValue: dbMock },
      ],
    }).compile();

    service = module.get<DessmonitorService>(DessmonitorService);
    httpService = httpMock;
    credentialsService = credsMock;
    dbService = dbMock;
  });

  describe('fetchLatest', () => {
    it('returns false when buildUrl returns null', async () => {
      credentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchLatest('P1');

      expect(result).toBe(false);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('returns true and saves data when API returns success', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/?action=querySPDeviceLastData');
      httpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: { gts: '2025-02-01 12:00:00', pars: { bt_: [{ par: 'voltage', val: '48' }] } },
          },
        }),
      );

      const result = await service.fetchLatest('P1');

      expect(result).toBe(true);
      expect(dbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO latest_data (pn, json, gts, fetched_at) VALUES (?, ?, ?, ?)',
        expect.any(Array),
      );
    });

    it('returns false when API returns err!==0 and no env credentials for relogin', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/');
      httpService.get.mockReturnValue(of({ data: { err: 401, desc: 'Token expired' } }));
      credentialsService.hasEnvCredentials.mockReturnValue(false);

      const result = await service.fetchLatest('P1');

      expect(result).toBe(false);
      expect(credentialsService.reloginFromEnv).not.toHaveBeenCalled();
    });

    it('retries and succeeds after relogin when env credentials exist', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/');
      credentialsService.hasEnvCredentials.mockReturnValue(true);
      credentialsService.reloginFromEnv.mockResolvedValue(true);
      httpService.get
        .mockReturnValueOnce(of({ data: { err: 401, desc: 'Token expired' } }))
        .mockReturnValueOnce(
          of({
            data: {
              err: 0,
              dat: { gts: '2025-02-01 12:00:00', pars: {} },
            },
          }),
        );

      const result = await service.fetchLatest('P1');

      expect(result).toBe(true);
      expect(credentialsService.reloginFromEnv).toHaveBeenCalledTimes(1);
      expect(httpService.get).toHaveBeenCalledTimes(2);
    });

    it('returns false when relogin succeeds but retry still fails', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/');
      credentialsService.hasEnvCredentials.mockReturnValue(true);
      credentialsService.reloginFromEnv.mockResolvedValue(true);
      httpService.get
        .mockReturnValueOnce(of({ data: { err: 401 } }))
        .mockReturnValueOnce(of({ data: { err: 500 } }));

      const result = await service.fetchLatest('P1');

      expect(result).toBe(false);
      expect(credentialsService.reloginFromEnv).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchChartField', () => {
    it('returns false when buildUrl returns null', async () => {
      credentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchChartField(
        'P1',
        'bt_battery_voltage',
        '2025-02-01 00:00:00',
        '2025-02-01 23:59:59',
      );

      expect(result).toBe(false);
    });

    it('returns true and stores chart data when API returns success', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/');
      httpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: [
              { key: '2025-02-01 12:00:00', val: '48.5' },
              { key: '2025-02-01 13:00:00', val: '49.0' },
            ],
          },
        }),
      );

      const result = await service.fetchChartField(
        'P1',
        'bt_battery_voltage',
        '2025-02-01 00:00:00',
        '2025-02-01 23:59:59',
      );

      expect(result).toBe(true);
      expect(dbService.run).toHaveBeenCalledTimes(2);
      expect(dbService.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchKeyParameterOneDay', () => {
    it('returns false when buildUrl returns null', async () => {
      credentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchKeyParameterOneDay('P1', 'BATTERY_VOLTAGE', '2025-02-01');

      expect(result).toBe(false);
    });

    it('returns true and stores key param data when API returns success', async () => {
      credentialsService.buildUrl.mockResolvedValue('https://api/');
      httpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: {
              detail: [
                { ts: '2025-02-01 12:00:00', val: '48' },
                { ts: '2025-02-01 13:00:00', val: '49' },
              ],
            },
          },
        }),
      );

      const result = await service.fetchKeyParameterOneDay('P1', 'BATTERY_VOLTAGE', '2025-02-01');

      expect(result).toBe(true);
      expect(dbService.run).toHaveBeenCalledTimes(2);
    });
  });
});

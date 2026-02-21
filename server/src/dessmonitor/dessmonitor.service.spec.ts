import { HttpService } from '@nestjs/axios';
import { Test, type TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { CredentialsService } from '../credentials/credentials.service';
import { DatabaseService } from '../db/database.service';
import { DessmonitorService } from './dessmonitor.service';

describe('DessmonitorService', () => {
  let service: DessmonitorService;
  let httpService: HttpService;
  let credentialsService: CredentialsService;
  let dbService: DatabaseService;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockCredentialsService = {
    buildUrl: jest.fn(),
  };

  const mockDbService = {
    run: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn((fn: () => Promise<void>) => fn()),
    all: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DessmonitorService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<DessmonitorService>(DessmonitorService);
    httpService = module.get<HttpService>(HttpService);
    credentialsService = module.get<CredentialsService>(CredentialsService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  describe('fetchLatest', () => {
    const pn = 'Q0032148690598';
    const url = 'https://web.dessmonitor.com/public/?action=querySPDeviceLastData&pn=' + pn;

    it('returns false when buildUrl returns null (no credentials)', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchLatest(pn);

      expect(result).toBe(false);
      expect(mockHttpService.get).not.toHaveBeenCalled();
      expect(mockDbService.run).not.toHaveBeenCalled();
    });

    it('returns false when API returns err !== 0', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({
          data: { err: 6, desc: 'ERR_FORMAT_ERROR' },
        }),
      );

      const result = await service.fetchLatest(pn);

      expect(result).toBe(false);
      expect(mockDbService.run).not.toHaveBeenCalled();
    });

    it('returns false when API returns empty dat', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({
          data: { err: 0, desc: 'ERR_NONE' },
        }),
      );

      const result = await service.fetchLatest(pn);

      expect(result).toBe(false);
      expect(mockDbService.run).not.toHaveBeenCalled();
    });

    it('returns false on HTTP/network error', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.fetchLatest(pn);

      expect(result).toBe(false);
      expect(mockDbService.run).not.toHaveBeenCalled();
    });

    it('inserts into latest_data and returns true on success', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            desc: 'ERR_NONE',
            dat: {
              pars: {
                gd_: [{ id: 'gd_ac_input_voltage', par: 'AC Input Voltage', val: '230', unit: 'V' }],
              },
              gts: '2026-02-22 10:00:00',
            },
          },
        }),
      );

      const result = await service.fetchLatest(pn);

      expect(result).toBe(true);
      expect(mockCredentialsService.buildUrl).toHaveBeenCalledWith(
        'querySPDeviceLastData',
        { i18n: 'en_US' },
        pn,
      );
      expect(mockDbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO latest_data (pn, json, gts, fetched_at) VALUES (?, ?, ?, ?)',
        expect.arrayContaining([
          pn,
          expect.stringContaining('gd_ac_input_voltage'),
          '2026-02-22 10:00:00',
          expect.any(Number),
        ]),
      );
    });

    it('handles dat.pars as null/undefined', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: { gts: '2026-02-22 10:00:00' },
          },
        }),
      );

      const result = await service.fetchLatest(pn);

      expect(result).toBe(true);
      expect(mockDbService.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([pn, '{}', '2026-02-22 10:00:00', expect.any(Number)]),
      );
    });
  });

  describe('fetchChartField', () => {
    const pn = 'Q0032148690598';
    const field = 'bt_battery_voltage';
    const sdate = '2026-02-21 00:00:00';
    const edate = '2026-02-21 23:59:59';
    const url = 'https://web.dessmonitor.com/public/?action=queryDeviceChartFieldDetailData';

    it('returns false when buildUrl returns null', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchChartField(pn, field, sdate, edate);

      expect(result).toBe(false);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('returns false when API returns error', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({ data: { err: 6, desc: 'ERR_FORMAT_ERROR' } }),
      );

      const result = await service.fetchChartField(pn, field, sdate, edate);

      expect(result).toBe(false);
      expect(mockDbService.transaction).not.toHaveBeenCalled();
    });

    it('inserts chart points and returns true on success', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(url);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: [
              { key: '2026-02-21 08:00:00', val: '52.1' },
              { key: '2026-02-21 09:00:00', val: '52.2' },
            ],
          },
        }),
      );

      const result = await service.fetchChartField(pn, field, sdate, edate);

      expect(result).toBe(true);
      expect(mockCredentialsService.buildUrl).toHaveBeenCalledWith(
        'queryDeviceChartFieldDetailData',
        expect.objectContaining({
          field,
          precision: '5',
          sdate,
          edate,
          i18n: 'en_US',
          chartStatus: 'false',
        }),
        pn,
      );
      expect(mockDbService.transaction).toHaveBeenCalled();
      expect(mockDbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO chart_data (pn, field, ts, val) VALUES (?, ?, ?, ?)',
        [pn, field, '2026-02-21 08:00:00', 52.1],
      );
      expect(mockDbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO chart_data (pn, field, ts, val) VALUES (?, ?, ?, ?)',
        [pn, field, '2026-02-21 09:00:00', 52.2],
      );
    });
  });

  describe('fetchKeyParameterOneDay', () => {
    const pn = 'Q0032148690598';
    const parameter = 'BATTERY_SOC';
    const date = '2026-02-22';

    it('returns false when buildUrl returns null', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue(null);

      const result = await service.fetchKeyParameterOneDay(pn, parameter, date);

      expect(result).toBe(false);
    });

    it('returns false when API returns error or no detail', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue('https://example.com');
      mockHttpService.get.mockReturnValue(
        of({ data: { err: 12, desc: 'ERR_NO_RECORD' } }),
      );

      const result = await service.fetchKeyParameterOneDay(pn, parameter, date);

      expect(result).toBe(false);
    });

    it('inserts key param points and returns true on success', async () => {
      mockCredentialsService.buildUrl.mockResolvedValue('https://example.com');
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: {
              detail: [
                { ts: '2026-02-22 10:00:00', val: '85' },
                { ts: '2026-02-22 11:00:00', val: '86' },
              ],
            },
          },
        }),
      );

      const result = await service.fetchKeyParameterOneDay(pn, parameter, date);

      expect(result).toBe(true);
      expect(mockDbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO key_param_data (pn, parameter, ts, val) VALUES (?, ?, ?, ?)',
        [pn, parameter, '2026-02-22 10:00:00', 85],
      );
      expect(mockDbService.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO key_param_data (pn, parameter, ts, val) VALUES (?, ?, ?, ?)',
        [pn, parameter, '2026-02-22 11:00:00', 86],
      );
    });
  });

  describe('fetchChartDataForRange', () => {
    it('calls fetchChartField for each CHART_FIELDS and sleeps between', async () => {
      const pn = 'Q0032148690598';
      const startDate = new Date('2026-02-21');
      const endDate = new Date('2026-02-22');

      mockCredentialsService.buildUrl.mockResolvedValue('https://example.com');
      mockHttpService.get.mockReturnValue(
        of({ data: { err: 0, dat: [] } }),
      );

      const start = Date.now();
      await service.fetchChartDataForRange(pn, startDate, endDate);
      const elapsed = Date.now() - start;

      expect(mockDbService.transaction).toHaveBeenCalled();
      // 9 CHART_FIELDS, 500ms sleep each = at least ~4s
      expect(elapsed).toBeGreaterThanOrEqual(4000);
    });
  });

  describe('fetchBatteryVoltageChart', () => {
    it('fetches yesterday and today, prunes older data when successful', async () => {
      const pn = 'Q0032148690598';

      mockCredentialsService.buildUrl.mockResolvedValue('https://example.com');
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            err: 0,
            dat: [{ key: '2026-02-22 10:00:00', val: '52' }],
          },
        }),
      );

      await service.fetchBatteryVoltageChart(pn);

      expect(mockDbService.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM chart_data'),
        expect.arrayContaining([pn, expect.any(String)]),
      );
    });
  });

  describe('fetchKeyParamsForDate', () => {
    it('calls fetchKeyParameterOneDay for each KEY_PARAMETER', async () => {
      const pn = 'Q0032148690598';
      const date = new Date('2026-02-22');

      mockCredentialsService.buildUrl.mockResolvedValue('https://example.com');
      mockHttpService.get.mockReturnValue(
        of({ data: { err: 0, dat: { detail: [] } } }),
      );

      await service.fetchKeyParamsForDate(pn, date);

      // 6 KEY_PARAMETERS
      expect(mockHttpService.get).toHaveBeenCalledTimes(6);
    });
  });
});

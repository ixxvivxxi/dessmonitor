import { Test, type TestingModule } from '@nestjs/testing';
import { CredentialsService } from '../credentials/credentials.service';
import { DessmonitorScheduler } from './dessmonitor.scheduler';
import { DessmonitorService } from './dessmonitor.service';

describe('DessmonitorScheduler', () => {
  let scheduler: DessmonitorScheduler;
  let credentialsService: CredentialsService;
  let dessmonitorService: DessmonitorService;

  const mockCredentialsService = {
    getCredentials: jest.fn(),
    getDevices: jest.fn(),
    ensureCredentialsFromEnv: jest.fn().mockResolvedValue(undefined),
  };

  const mockDessmonitorService = {
    fetchLatest: jest.fn().mockResolvedValue(true),
    fetchChartData: jest.fn().mockResolvedValue(undefined),
    fetchKeyParamsForDate: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DessmonitorScheduler,
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: DessmonitorService, useValue: mockDessmonitorService },
      ],
    }).compile();

    scheduler = module.get<DessmonitorScheduler>(DessmonitorScheduler);
    credentialsService = module.get<CredentialsService>(CredentialsService);
    dessmonitorService = module.get<DessmonitorService>(DessmonitorService);
  });

  describe('onModuleInit', () => {
    it('calls ensureCredentialsFromEnv', async () => {
      mockCredentialsService.getDevices.mockResolvedValue([
        { pn: 'Q0032148690598', sn: 'S1', devcode: '2477', devaddr: '5' },
      ]);

      await scheduler.onModuleInit();

      expect(mockCredentialsService.ensureCredentialsFromEnv).toHaveBeenCalled();
    });

    it('fetches latest and chart data for each device from getDevices', async () => {
      mockCredentialsService.getDevices.mockResolvedValue([
        { pn: 'DEV1', sn: 'S1', devcode: '2477', devaddr: '5' },
        { pn: 'DEV2', sn: 'S2', devcode: '2477', devaddr: '6' },
      ]);

      await scheduler.onModuleInit();

      expect(mockDessmonitorService.fetchLatest).toHaveBeenCalledWith('DEV1');
      expect(mockDessmonitorService.fetchLatest).toHaveBeenCalledWith('DEV2');
      expect(mockDessmonitorService.fetchChartData).toHaveBeenCalledWith('DEV1');
      expect(mockDessmonitorService.fetchChartData).toHaveBeenCalledWith('DEV2');
    });

    it('uses creds.params.pn when devices is empty', async () => {
      mockCredentialsService.getDevices.mockResolvedValue([]);
      mockCredentialsService.getCredentials.mockReturnValue({
        params: { pn: 'LEGACY_PN' },
      });

      await scheduler.onModuleInit();

      expect(mockDessmonitorService.fetchLatest).toHaveBeenCalledWith('LEGACY_PN');
      expect(mockDessmonitorService.fetchChartData).toHaveBeenCalledWith('LEGACY_PN');
    });
  });

  describe('handleLatestFetch', () => {
    it('skips when no credentials', async () => {
      mockCredentialsService.getCredentials.mockReturnValue(null);

      await scheduler.handleLatestFetch();

      expect(mockDessmonitorService.fetchLatest).not.toHaveBeenCalled();
    });

    it('fetches latest for each device when credentials exist', async () => {
      mockCredentialsService.getCredentials.mockReturnValue({ params: {} });
      mockCredentialsService.getDevices.mockResolvedValue([
        { pn: 'DEV1', sn: 'S1', devcode: '2477', devaddr: '5' },
      ]);

      await scheduler.handleLatestFetch();

      expect(mockDessmonitorService.fetchLatest).toHaveBeenCalledWith('DEV1');
    });
  });

  describe('handleChartFetch', () => {
    it('skips when no credentials', async () => {
      mockCredentialsService.getCredentials.mockReturnValue(null);

      await scheduler.handleChartFetch();

      expect(mockDessmonitorService.fetchChartData).not.toHaveBeenCalled();
    });

    it('fetches chart data for each device', async () => {
      mockCredentialsService.getCredentials.mockReturnValue({ params: {} });
      mockCredentialsService.getDevices.mockResolvedValue([
        { pn: 'DEV1', sn: 'S1', devcode: '2477', devaddr: '5' },
      ]);

      await scheduler.handleChartFetch();

      expect(mockDessmonitorService.fetchChartData).toHaveBeenCalledWith('DEV1');
    });
  });

  describe('handleDailyKeyParamFetch', () => {
    it('skips when no credentials', async () => {
      mockCredentialsService.getCredentials.mockReturnValue(null);

      await scheduler.handleDailyKeyParamFetch();

      expect(mockDessmonitorService.fetchKeyParamsForDate).not.toHaveBeenCalled();
    });

    it('fetches key params for today and yesterday', async () => {
      mockCredentialsService.getCredentials.mockReturnValue({ params: {} });
      mockCredentialsService.getDevices.mockResolvedValue([
        { pn: 'DEV1', sn: 'S1', devcode: '2477', devaddr: '5' },
      ]);

      await scheduler.handleDailyKeyParamFetch();

      expect(mockDessmonitorService.fetchKeyParamsForDate).toHaveBeenCalled();
    });
  });
});

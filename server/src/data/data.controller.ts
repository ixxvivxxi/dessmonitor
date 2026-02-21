import { Controller, Get, Query } from '@nestjs/common';
import { DateTime } from 'luxon';
import { CredentialsService } from '../credentials/credentials.service';
import { DataService } from './data.service';

function formatDatetime(dt: DateTime): string {
  return dt.toFormat('yyyy-MM-dd HH:mm:ss');
}

@Controller('data')
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly credentialsService: CredentialsService,
  ) {}

  @Get('latest')
  async getLatest(@Query('pn') pn?: string) {
    const resolved = pn?.trim() || (await this.resolveDefaultPn());
    return this.dataService.getLatest(resolved ?? undefined);
  }

  private async resolveDefaultPn(): Promise<string | null> {
    const devices = await this.credentialsService.getDevices();
    if (devices.length > 0) return devices[0].pn;
    const creds = this.credentialsService.getCredentials();
    if (creds?.params?.pn) return creds.params.pn;
    return 'default'; // fallback for migrated single-device data
  }

  @Get('chart')
  async getChart(
    @Query('pn') pn: string,
    @Query('field') field: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const resolved = pn?.trim() || (await this.resolveDefaultPn());
    if (!resolved) return { error: 'pn (device product number) is required' };
    if (!field) return { error: 'field is required' };
    const now = DateTime.now();
    const startDate = start ?? formatDatetime(now.minus({ days: 2 }).startOf('day'));
    const endDate = end ?? formatDatetime(now.endOf('day'));
    return this.dataService.getChartData(resolved, field, startDate, endDate);
  }

  @Get('key-param')
  async getKeyParam(
    @Query('pn') pn: string,
    @Query('parameter') parameter: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const resolved = pn?.trim() || (await this.resolveDefaultPn());
    if (!resolved) return { error: 'pn (device product number) is required' };
    if (!parameter) return { error: 'parameter is required' };
    const now = DateTime.now();
    const startDate = start ?? formatDatetime(now.minus({ hours: 24 }));
    const endDate = end ?? formatDatetime(now);
    return this.dataService.getKeyParamData(resolved, parameter, startDate, endDate);
  }
}

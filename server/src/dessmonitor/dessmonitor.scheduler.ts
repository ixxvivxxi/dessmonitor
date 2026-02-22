import { Injectable, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { CredentialsService } from '../credentials/credentials.service';
import { DessmonitorService } from './dessmonitor.service';

@Injectable()
export class DessmonitorScheduler implements OnModuleInit {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly dessmonitorService: DessmonitorService,
  ) {}

  /** PN values to fetch: devices from DB, or creds.params.pn when devices table is empty. */
  private async getPnsToFetch(): Promise<string[]> {
    const devices = await this.credentialsService.getDevices();
    if (devices.length > 0) return devices.map((d) => d.pn);
    const creds = this.credentialsService.getCredentials();
    const pn = creds?.params?.pn?.trim();
    return pn ? [pn] : [];
  }

  async onModuleInit(): Promise<void> {
    await this.credentialsService.ensureCredentialsFromEnv();
    const pns = await this.getPnsToFetch();
    for (const pn of pns) {
      void this.dessmonitorService.fetchLatest(pn);
      void this.dessmonitorService.fetchBatteryVoltageChart(pn);
    }
  }

  /** Fetch latest device data every 5 minutes (for each device in DB) */
  @Cron('*/2 * * * *')
  async handleLatestFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const pns = await this.getPnsToFetch();
    for (const pn of pns) {
      await this.dessmonitorService.fetchLatest(pn);
    }
  }

  /** Fetch battery voltage chart every 5 minutes; keep last 2 days in DB */
  @Cron('*/5 * * * *')
  async handleBatteryVoltageChartFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const pns = await this.getPnsToFetch();
    for (const pn of pns) {
      await this.dessmonitorService.fetchBatteryVoltageChart(pn);
    }
  }

  /** Fetch chart field detail data once per day for yesterday and today */
  @Cron('0 0 * * *')
  async handleDailyChartFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const pns = await this.getPnsToFetch();
    const today = DateTime.local().startOf('day');
    const yesterday = today.minus({ days: 1 });
    for (const pn of pns) {
      await this.dessmonitorService.fetchChartDataForRange(
        pn,
        yesterday.toJSDate(),
        today.toJSDate(),
      );
    }
  }

  /** Fetch key parameter one-day data once per day */
  @Cron('5 0 * * *')
  async handleDailyKeyParamFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const pns = await this.getPnsToFetch();
    const today = DateTime.local().startOf('day');
    const yesterday = today.minus({ days: 1 });
    for (const pn of pns) {
      await this.dessmonitorService.fetchKeyParamsForDate(pn, today.toJSDate());
      await this.dessmonitorService.fetchKeyParamsForDate(pn, yesterday.toJSDate());
    }
  }
}

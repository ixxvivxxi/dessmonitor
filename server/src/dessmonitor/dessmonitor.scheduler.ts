import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CredentialsService } from '../credentials/credentials.service';
import { DessmonitorService } from './dessmonitor.service';

@Injectable()
export class DessmonitorScheduler implements OnModuleInit {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly dessmonitorService: DessmonitorService,
  ) {}

  onModuleInit(): void {
    if (this.credentialsService.getCredentials()) {
      void this.dessmonitorService.fetchLatest();
    }
  }

  /** Fetch latest device data every 5 minutes */
  @Cron('*/5 * * * *')
  async handleLatestFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    await this.dessmonitorService.fetchLatest();
  }

  /** Fetch chart field detail data once per day for yesterday and today */
  @Cron('0 0 * * *')
  async handleDailyChartFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = yesterday;
    const end = now;
    await this.dessmonitorService.fetchChartDataForRange(start, end);
  }

  /** Fetch key parameter one-day data once per day */
  @Cron('5 0 * * *')
  async handleDailyKeyParamFetch(): Promise<void> {
    if (!this.credentialsService.getCredentials()) return;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    await this.dessmonitorService.fetchKeyParamsForDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    await this.dessmonitorService.fetchKeyParamsForDate(yesterday);
  }
}

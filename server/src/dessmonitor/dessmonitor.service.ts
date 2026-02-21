import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CredentialsService } from '../credentials/credentials.service';
import { DatabaseService } from '../db/database.service';

// Known chart fields from dessmonitor-homeassistant
const CHART_FIELDS = [
  'bt_battery_voltage',
  'bt_battery_capacity',
  'pv_output_power',
  'pv_input_voltage',
  'gd_ac_input_voltage',
  'gd_ac_input_frequency',
  'bc_output_apparent_power',
  'bc_output_voltage',
] as const;

// Key parameters for daily aggregation
const KEY_PARAMETERS = [
  'GRID_ACTIVE_POWER',
  'PV_ACTIVE_POWER',
  'LOAD_ACTIVE_POWER',
  'BATTERY_ACTIVE_POWER',
  'BATTERY_VOLTAGE',
  'BATTERY_SOC',
] as const;

interface DessmonitorResponse<T> {
  err: number;
  desc?: string;
  dat?: T;
}

interface LatestDataPars {
  gd_?: Array<{ id: string; par: string; val: string; unit?: string }>;
  sy_?: Array<{ id: string; par: string; val: string; unit?: string }>;
  pv_?: Array<{ id: string; par: string; val: string; unit?: string }>;
  bt_?: Array<{ id: string; par: string; val: string; unit?: string }>;
  bc_?: Array<{ id: string; par: string; val: string; unit?: string }>;
}

interface ChartDataPoint {
  key: string;
  val: string;
}

interface KeyParamPoint {
  val: string;
  ts: string;
}

@Injectable()
export class DessmonitorService {
  private readonly logger = new Logger(DessmonitorService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialsService: CredentialsService,
    private readonly dbService: DatabaseService,
  ) {}

  async fetchLatest(): Promise<boolean> {
    const url = this.credentialsService.buildUrl('querySPDeviceLastData');
    if (!url) {
      this.logger.warn('fetchLatest: no credentials');
      return false;
    }
    try {
      this.logger.debug('fetchLatest: fetching');
      const { data } = await firstValueFrom(
        this.httpService.get<
          DessmonitorResponse<{ gts: string; pars: LatestDataPars }>
        >(url),
      );
      if (data.err !== 0 || !data.dat) {
        this.logger.warn(
          `fetchLatest: API error err=${data.err} desc=${data.desc}`,
        );
        return false;
      }
      await this.dbService.run(
        'INSERT OR REPLACE INTO latest_data (id, json, gts, fetched_at) VALUES (1, ?, ?, ?)',
        [
          JSON.stringify(data.dat.pars ?? {}),
          data.dat.gts ?? '',
          Math.floor(Date.now() / 1000),
        ],
      );
      this.logger.log('fetchLatest: OK');
      return true;
    } catch (e) {
      this.logger.error(
        `fetchLatest failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  async fetchChartField(
    field: string,
    sdate: string,
    edate: string,
  ): Promise<boolean> {
    const url = this.credentialsService.buildUrl(
      'queryDeviceChartFieldDetailData',
      {
        field,
        precision: '5',
        sdate,
        edate,
        chartStatus: 'false',
      },
    );
    if (!url) return false;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<ChartDataPoint[]>>(url),
      );
      if (data.err !== 0 || !Array.isArray(data.dat)) {
        this.logger.debug(
          `fetchChartField ${field}: API error err=${data.err}`,
        );
        return false;
      }
      await this.dbService.transaction(async () => {
        for (const p of data.dat!) {
          await this.dbService.run(
            'INSERT OR REPLACE INTO chart_data (field, ts, val) VALUES (?, ?, ?)',
            [field, p.key, parseFloat(p.val) || 0],
          );
        }
      });
      this.logger.debug(`fetchChartField ${field}: ${data.dat.length} points`);
      return true;
    } catch (e) {
      this.logger.warn(
        `fetchChartField ${field} failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  async fetchKeyParameterOneDay(
    parameter: string,
    date: string,
  ): Promise<boolean> {
    const url = this.credentialsService.buildUrl(
      'querySPDeviceKeyParameterOneDay',
      {
        parameter,
        date,
        chartStatus: 'false',
      },
    );
    if (!url) return false;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<{ detail: KeyParamPoint[] }>>(
          url,
        ),
      );
      const detail = data.dat?.detail;
      if (data.err !== 0 || !detail) {
        this.logger.debug(
          `fetchKeyParameterOneDay ${parameter} ${date}: API error err=${data.err}`,
        );
        return false;
      }
      await this.dbService.transaction(async () => {
        for (const p of detail) {
          await this.dbService.run(
            'INSERT OR REPLACE INTO key_param_data (parameter, ts, val) VALUES (?, ?, ?)',
            [parameter, p.ts, parseFloat(p.val) || 0],
          );
        }
      });
      this.logger.debug(
        `fetchKeyParameterOneDay ${parameter} ${date}: ${detail.length} points`,
      );
      return true;
    } catch (e) {
      this.logger.warn(
        `fetchKeyParameterOneDay ${parameter} ${date} failed: ${e instanceof Error ? e.message : e}`,
      );
      return false;
    }
  }

  /** Fetch chart data for yesterday and today to backfill/keep monthly data current. */
  async fetchChartDataForRange(startDate: Date, endDate: Date): Promise<void> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;
    const fmtEnd = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59:59`;
    const sdate = fmt(startDate);
    const edate = fmtEnd(endDate);
    this.logger.log(`fetchChartDataForRange: ${sdate} - ${edate}`);
    let ok = 0;
    for (const field of CHART_FIELDS) {
      if (await this.fetchChartField(field, sdate, edate)) ok++;
      await this.sleep(500);
    }
    this.logger.log(
      `fetchChartDataForRange: ${ok}/${CHART_FIELDS.length} fields OK`,
    );
  }

  /** Fetch key parameters for a given date. */
  async fetchKeyParamsForDate(date: Date): Promise<void> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    this.logger.log(`fetchKeyParamsForDate: ${dateStr}`);
    let ok = 0;
    for (const param of KEY_PARAMETERS) {
      if (await this.fetchKeyParameterOneDay(param, dateStr)) ok++;
      await this.sleep(500);
    }
    this.logger.log(
      `fetchKeyParamsForDate: ${ok}/${KEY_PARAMETERS.length} params OK`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

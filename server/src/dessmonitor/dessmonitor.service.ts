import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import { CredentialsService } from '../credentials/credentials.service';
import { DatabaseService } from '../db/database.service';

// Known chart fields from dessmonitor-homeassistant
const CHART_FIELDS = [
  'bt_battery_voltage',
  'bt_battery_capacity',
  'bt_battery_charging_current',
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

  async fetchLatest(pn: string): Promise<boolean> {
    const doFetch = async (): Promise<boolean> => {
      const url = await this.credentialsService.buildUrl(
        'querySPDeviceLastData',
        { i18n: 'en_US' },
        pn,
      );
      if (!url) {
        this.logger.warn('fetchLatest: no credentials or device');
        return false;
      }
      this.logger.debug(`fetchLatest: fetching pn=${pn}`);
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<{ gts: string; pars: LatestDataPars }>>(url),
      );
      if (data.err !== 0 || !data.dat) {
        throw new Error(`API error err=${data.err} desc=${data.desc ?? ''}`);
      }
      await this.dbService.run(
        'INSERT OR REPLACE INTO latest_data (pn, json, gts, fetched_at) VALUES (?, ?, ?, ?)',
        [pn, JSON.stringify(data.dat.pars ?? {}), data.dat.gts ?? '', Math.floor(Date.now() / 1000)],
      );
      this.logger.log(`fetchLatest: OK pn=${pn}`);
      return true;
    };
    return this.withAuthRetry(doFetch, 'fetchLatest', pn);
  }

  async fetchChartField(pn: string, field: string, sdate: string, edate: string): Promise<boolean> {
    const doFetch = async (): Promise<boolean> => {
      const url = await this.credentialsService.buildUrl(
        'queryDeviceChartFieldDetailData',
        {
          field,
          precision: '5',
          sdate,
          edate,
          i18n: 'en_US',
          chartStatus: 'false',
        },
        pn,
      );
      if (!url) return false;
      this.logger.debug(`fetchChartField pn=${pn} field=${field}`);
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<ChartDataPoint[]>>(url, {
          timeout: 45000, // chart API can be slow; default 15s often times out
        }),
      );
      if (data.err !== 0 || !Array.isArray(data.dat)) {
        throw new Error(`API error err=${data.err} desc=${data.desc ?? '(none)'}`);
      }
      await this.dbService.transaction(async () => {
        for (const p of data.dat!) {
          await this.dbService.run(
            'INSERT OR REPLACE INTO chart_data (pn, field, ts, val) VALUES (?, ?, ?, ?)',
            [pn, field, p.key, Number.parseFloat(p.val) || 0],
          );
        }
      });
      this.logger.debug(`fetchChartField ${field}: ${data.dat.length} points`);
      return true;
    };
    return this.withAuthRetry(doFetch, `fetchChartField ${field}`, pn);
  }

  async fetchKeyParameterOneDay(pn: string, parameter: string, date: string): Promise<boolean> {
    const doFetch = async (): Promise<boolean> => {
      const url = await this.credentialsService.buildUrl(
        'querySPDeviceKeyParameterOneDay',
        {
          parameter,
          date,
          i18n: 'en_US',
          chartStatus: 'false',
        },
        pn,
      );
      if (!url) return false;
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<{ detail: KeyParamPoint[] }>>(url),
      );
      const detail = data.dat?.detail;
      if (data.err !== 0 || !detail) {
        throw new Error(`API error err=${data.err}`);
      }
      await this.dbService.transaction(async () => {
        for (const p of detail) {
          await this.dbService.run(
            'INSERT OR REPLACE INTO key_param_data (pn, parameter, ts, val) VALUES (?, ?, ?, ?)',
            [pn, parameter, p.ts, Number.parseFloat(p.val) || 0],
          );
        }
      });
      this.logger.debug(`fetchKeyParameterOneDay ${parameter} ${date}: ${detail.length} points`);
      return true;
    };
    return this.withAuthRetry(doFetch, `fetchKeyParameterOneDay ${parameter} ${date}`, pn);
  }

  /** Fetch chart data for yesterday and today to backfill/keep monthly data current. */
  async fetchChartDataForRange(pn: string, startDate: Date, endDate: Date): Promise<void> {
    const sdate = DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd') + ' 00:00:00';
    const edate = DateTime.fromJSDate(endDate).toFormat('yyyy-MM-dd') + ' 23:59:59';
    this.logger.log(`fetchChartDataForRange pn=${pn}: ${sdate} - ${edate}`);
    let ok = 0;
    for (const field of CHART_FIELDS) {
      if (await this.fetchChartField(pn, field, sdate, edate)) ok++;
      await this.sleep(500);
    }
    this.logger.log(`fetchChartDataForRange: ${ok}/${CHART_FIELDS.length} fields OK`);
  }

  /** Fetch battery voltage chart (bt_battery_voltage) for last 2 days and prune older data.
   * Dessmonitor API expects one day per request (sdate/edate same day). */
  async fetchBatteryVoltageChart(pn: string): Promise<void> {
    const now = DateTime.local();
    const today = now.startOf('day');
    const yesterday = today.minus({ days: 1 });
    let ok = 0;
    for (const day of [yesterday, today]) {
      const dateStr = day.toFormat('yyyy-MM-dd');
      const sdate = `${dateStr} 00:00:00`;
      const edate = `${dateStr} 23:59:59`;
      this.logger.log(`fetchBatteryVoltageChart pn=${pn}: ${sdate} - ${edate}`);
      if (await this.fetchChartField(pn, 'bt_battery_voltage', sdate, edate)) ok++;
      await this.sleep(500);
    }
    if (ok > 0) {
      const cutoff = now.minus({ days: 2 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      await this.dbService.run(
        "DELETE FROM chart_data WHERE pn = ? AND field = 'bt_battery_voltage' AND ts < ?",
        [pn, cutoff],
      );
      this.logger.debug(`fetchBatteryVoltageChart: pruned rows older than ${cutoff}`);
    }
  }

  /** Fetch key parameters for a given date. */
  async fetchKeyParamsForDate(pn: string, date: Date): Promise<void> {
    const dateStr = DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    this.logger.log(`fetchKeyParamsForDate pn=${pn}: ${dateStr}`);
    let ok = 0;
    for (const param of KEY_PARAMETERS) {
      if (await this.fetchKeyParameterOneDay(pn, param, dateStr)) ok++;
      await this.sleep(500);
    }
    this.logger.log(`fetchKeyParamsForDate: ${ok}/${KEY_PARAMETERS.length} params OK`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Execute a fetch operation; on failure, relogin from env (if available) and retry once.
   * Only relogins when DESS_USR, DESS_PWD, DESS_COMPANY_KEY are set.
   */
  private async withAuthRetry(
    op: () => Promise<boolean>,
    label: string,
    pn: string,
  ): Promise<boolean> {
    try {
      return await op();
    } catch (e) {
      if (
        this.credentialsService.hasEnvCredentials() &&
        (await this.credentialsService.reloginFromEnv())
      ) {
        try {
          return await op();
        } catch (retryErr) {
          this.logger.warn(
            `${label} retry failed (pn=${pn}): ${retryErr instanceof Error ? retryErr.message : retryErr}`,
          );
          return false;
        }
      }
      this.logger.warn(`${label} failed (pn=${pn}): ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }
}

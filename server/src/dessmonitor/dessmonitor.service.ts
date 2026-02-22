import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import { CredentialsService } from '../credentials/credentials.service';
import { DatabaseService } from '../db/database.service';
import {
  CHART_FIELDS,
  CHART_TABLES,
  type ChartField,
} from '../data/chart-tables';

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

  /**
   * Fetch chart field from web.dessmonitor.com.
   * Only supports output_power, pv_output_power, bt_battery_voltage.
   * For output_power and pv_output_power, API returns ERR_FORMAT_ERROR when sdate/edate span multiple days; split into per-day requests.
   */
  async fetchChartField(
    pn: string,
    field: ChartField,
    sdate: string,
    edate: string,
  ): Promise<boolean> {
    const doFetchOneDay = async (daySdate: string, dayEdate: string): Promise<boolean> => {
      const url = await this.credentialsService.buildUrl(
        'queryDeviceChartFieldDetailData',
        {
          field,
          precision: '5',
          sdate: daySdate,
          edate: dayEdate,
          i18n: 'en_US',
          chartStatus: 'false',
        },
        pn,
      );
      if (!url) return false;
      this.logger.debug(`fetchChartField pn=${pn} field=${field} ${daySdate}..${dayEdate}`);
      const { data } = await firstValueFrom(
        this.httpService.get<DessmonitorResponse<ChartDataPoint[]>>(url, {
          timeout: 45000, // chart API can be slow; default 15s often times out
        }),
      );
      if (data.err !== 0 || !Array.isArray(data.dat)) {
        throw new Error(`API error err=${data.err} desc=${data.desc ?? '(none)'}`);
      }
      const table = CHART_TABLES[field as ChartField];
      const points = data.dat!
        .filter((p) => p.key != null && String(p.key).trim() !== '')
        .map((p) => ({
          ts: p.key!.trim(),
          val: Number.parseFloat(String(p.val ?? '')) || 0,
        }));
      await this.insertChartPoints(table, pn, points);
      this.logger.debug(`fetchChartField ${field}: ${data.dat.length} points`);
      return true;
    };

    const doFetch = async (): Promise<boolean> => {
      // web.dessmonitor.com returns ERR_FORMAT_ERROR when sdate/edate span multiple days
      const perDayFields = ['output_power', 'pv_output_power'];
      const needsPerDay =
        perDayFields.includes(field) && sdate.split(' ')[0] !== edate.split(' ')[0];
      if (needsPerDay) {
        const startDay = DateTime.fromFormat(sdate.split(' ')[0]!, 'yyyy-MM-dd');
        const endDay = DateTime.fromFormat(edate.split(' ')[0]!, 'yyyy-MM-dd');
        let ok = false;
        for (
          let d = startDay;
          d.toMillis() <= endDay.toMillis();
          d = d.plus({ days: 1 })
        ) {
          const dateStr = d.toFormat('yyyy-MM-dd');
          const daySdate = `${dateStr} 00:00:00`;
          const dayEdate = `${dateStr} 23:59:59`;
          if (await doFetchOneDay(daySdate, dayEdate)) ok = true;
          await this.sleep(500);
        }
        return ok;
      }
      return doFetchOneDay(sdate, edate);
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

  /**
   * Fetch chart data for output_power, pv_output_power, bt_battery_voltage.
   * Keeps last 2 days in DB; prunes older data.
   */
  async fetchChartData(pn: string): Promise<void> {
    const now = DateTime.local();
    const today = now.startOf('day');
    const yesterday = today.minus({ days: 1 });
    let ok = 0;
    for (const field of CHART_FIELDS) {
      for (const day of [yesterday, today]) {
        const dateStr = day.toFormat('yyyy-MM-dd');
        const sdate = `${dateStr} 00:00:00`;
        const edate = `${dateStr} 23:59:59`;
        if (await this.fetchChartField(pn, field, sdate, edate)) ok++;
        await this.sleep(500);
      }
    }
    if (ok > 0) {
      const cutoff = now.minus({ days: 2 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      for (const table of Object.values(CHART_TABLES)) {
        await this.dbService.run(`DELETE FROM ${table} WHERE pn = ? AND ts < ?`, [pn, cutoff]);
      }
      this.logger.debug(`fetchChartData: pruned rows older than ${cutoff}`);
    }
    this.logger.log(`fetchChartData pn=${pn}: ${ok} fetches OK`);
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

  /** Insert chart points in batch. */
  private async insertChartPoints(
    table: string,
    pn: string,
    points: Array<{ ts: string; val: number }>,
  ): Promise<void> {
    if (points.length === 0) return;
    const BATCH = 100;
    await this.dbService.transaction(async () => {
      for (let i = 0; i < points.length; i += BATCH) {
        const chunk = points.slice(i, i + BATCH);
        const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
        const params = chunk.flatMap((p) => [pn, p.ts, p.val]);
        await this.dbService.run(
          `INSERT OR REPLACE INTO ${table} (pn, ts, val) VALUES ${placeholders}`,
          params,
        );
      }
    });
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

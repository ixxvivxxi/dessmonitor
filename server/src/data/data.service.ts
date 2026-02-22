import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { DessmonitorService } from '../dessmonitor/dessmonitor.service';
import { type ChartField, getChartTable } from './chart-tables';

export type ChartPoint = { ts: string; val: number };

@Injectable()
export class DataService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly dessmonitorService: DessmonitorService,
  ) {}

  async getLatest(pn?: string | null): Promise<{
    pars: Record<string, unknown>;
    gts: string;
    fetchedAt: number;
  } | null> {
    let row: { json: string; gts: string; fetched_at: number } | undefined;
    if (pn?.trim()) {
      row = await this.dbService.get<{ json: string; gts: string; fetched_at: number }>(
        'SELECT json, gts, fetched_at FROM latest_data WHERE pn = ?',
        [pn.trim()],
      );
    }
    if (!row) {
      row = await this.dbService.get<{ json: string; gts: string; fetched_at: number }>(
        'SELECT json, gts, fetched_at FROM latest_data ORDER BY fetched_at DESC LIMIT 1',
      );
    }
    if (!row && pn?.trim()) {
      const ok = await this.dessmonitorService.fetchLatest(pn.trim());
      if (ok) {
        const r = await this.dbService.get<{ json: string; gts: string; fetched_at: number }>(
          'SELECT json, gts, fetched_at FROM latest_data WHERE pn = ?',
          [pn.trim()],
        );
        if (r) {
          try {
            const pars = JSON.parse(r.json) as Record<string, unknown>;
            return { pars, gts: r.gts ?? '', fetchedAt: r.fetched_at ?? 0 };
          } catch {
            /* fall through to null */
          }
        }
      }
    }
    if (!row) return null;
    try {
      const pars = JSON.parse(row.json) as Record<string, unknown>;
      return {
        pars,
        gts: row.gts ?? '',
        fetchedAt: row.fetched_at ?? 0,
      };
    } catch {
      return null;
    }
  }

  async getChartData(
    pn: string,
    field: string,
    start: string,
    end: string,
    limit?: number,
  ): Promise<ChartPoint[]> {
    const table = getChartTable(field);
    if (!table) return [];
    const query = `SELECT ts, val FROM ${table} WHERE pn = ? AND ts >= ? AND ts <= ? ORDER BY ts`;
    const params = [pn, start, end];

    let rows = await this.dbService.all<{ ts: string; val: number }>(query, params);
    if (rows.length === 0) {
      const ok = await this.dessmonitorService.fetchChartField(pn, field as ChartField, start, end);
      if (ok) {
        rows = await this.dbService.all<{ ts: string; val: number }>(query, params);
      }
    }
    if (limit != null && rows.length > limit) {
      rows = rows.slice(-limit); // most recent N points
    }
    return rows;
  }

  async getKeyParamData(
    pn: string,
    parameter: string,
    start: string,
    end: string,
  ): Promise<Array<{ ts: string; val: number }>> {
    return this.dbService.all<{ ts: string; val: number }>(
      'SELECT ts, val FROM key_param_data WHERE pn = ? AND parameter = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      [pn, parameter, start, end],
    );
  }
}

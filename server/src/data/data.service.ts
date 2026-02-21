import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { DessmonitorService } from '../dessmonitor/dessmonitor.service';

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
  ): Promise<Array<{ ts: string; val: number }>> {
    const rows = await this.dbService.all<{ ts: string; val: number }>(
      'SELECT ts, val FROM chart_data WHERE pn = ? AND field = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      [pn, field, start, end],
    );
    if (rows.length === 0) {
      void this.dessmonitorService.fetchChartField(pn, field, start, end);
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

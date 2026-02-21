import { Injectable } from '@nestjs/common';
import type { DatabaseService } from '../db/database.service';

@Injectable()
export class DataService {
  constructor(private readonly dbService: DatabaseService) {}

  async getLatest(): Promise<{
    pars: Record<string, unknown>;
    gts: string;
    fetchedAt: number;
  } | null> {
    const row = await this.dbService.get<{
      json: string;
      gts: string;
      fetched_at: number;
    }>('SELECT json, gts, fetched_at FROM latest_data WHERE id = 1');
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
    field: string,
    start: string,
    end: string,
  ): Promise<Array<{ ts: string; val: number }>> {
    return this.dbService.all<{ ts: string; val: number }>(
      'SELECT ts, val FROM chart_data WHERE field = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      [field, start, end],
    );
  }

  async getKeyParamData(
    parameter: string,
    start: string,
    end: string,
  ): Promise<Array<{ ts: string; val: number }>> {
    return this.dbService.all<{ ts: string; val: number }>(
      'SELECT ts, val FROM key_param_data WHERE parameter = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      [parameter, start, end],
    );
  }
}

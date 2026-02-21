import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';

@Injectable()
export class DataService {
  constructor(private readonly dbService: DatabaseService) {}

  getLatest(): {
    pars: Record<string, unknown>;
    gts: string;
    fetchedAt: number;
  } | null {
    const db = this.dbService.getDb();
    const row = db
      .prepare('SELECT json, gts, fetched_at FROM latest_data WHERE id = 1')
      .get() as { json: string; gts: string; fetched_at: number } | undefined;
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

  getChartData(
    field: string,
    start: string,
    end: string,
  ): Array<{ ts: string; val: number }> {
    const db = this.dbService.getDb();
    const rows = db
      .prepare(
        'SELECT ts, val FROM chart_data WHERE field = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      )
      .all(field, start, end) as Array<{ ts: string; val: number }>;
    return rows;
  }

  getKeyParamData(
    parameter: string,
    start: string,
    end: string,
  ): Array<{ ts: string; val: number }> {
    const db = this.dbService.getDb();
    const rows = db
      .prepare(
        'SELECT ts, val FROM key_param_data WHERE parameter = ? AND ts >= ? AND ts <= ? ORDER BY ts',
      )
      .all(parameter, start, end) as Array<{ ts: string; val: number }>;
    return rows;
  }
}

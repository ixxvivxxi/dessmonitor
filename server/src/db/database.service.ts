import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';

const DATA_DIR = 'data';
const DB_FILE = 'dessmonitor.db';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: sqlite3.Database | null = null;

  async onModuleInit(): Promise<void> {
    const dir = join(process.cwd(), DATA_DIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const path = join(dir, DB_FILE);
    await new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database(path, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await this.migrate();
  }

  private migrate(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db?.exec(
        `
      CREATE TABLE IF NOT EXISTS latest_data (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL,
        gts TEXT,
        fetched_at INTEGER NOT NULL
      );
      INSERT OR IGNORE INTO latest_data (id, json, gts, fetched_at) VALUES (1, '{}', '', 0);

      CREATE TABLE IF NOT EXISTS chart_data (
        field TEXT NOT NULL,
        ts TEXT NOT NULL,
        val REAL NOT NULL,
        PRIMARY KEY (field, ts)
      );
      CREATE INDEX IF NOT EXISTS idx_chart_field_ts ON chart_data(field, ts);

      CREATE TABLE IF NOT EXISTS key_param_data (
        parameter TEXT NOT NULL,
        ts TEXT NOT NULL,
        val REAL NOT NULL,
        PRIMARY KEY (parameter, ts)
      );
      CREATE INDEX IF NOT EXISTS idx_keyparam_param_ts ON key_param_data(parameter, ts);
    `,
        (err) => (err ? reject(err) : resolve()),
      );
    });
  }

  run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db?.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
  }

  get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db?.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
    });
  }

  all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db?.all(sql, params, (err, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])));
    });
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    await this.run('BEGIN');
    try {
      await fn();
      await this.run('COMMIT');
    } catch (e) {
      await this.run('ROLLBACK');
      throw e;
    }
  }

  onModuleDestroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

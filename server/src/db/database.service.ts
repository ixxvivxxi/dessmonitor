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

  private async migrate(): Promise<void> {
    const run = (sql: string, params: unknown[] = []) =>
      new Promise<void>((resolve, reject) => {
        this.db?.run(sql, params, (err) => (err ? reject(err) : resolve()));
      });
    const all = <T>(sql: string, params: unknown[] = []) =>
      new Promise<T[]>((resolve, reject) => {
        this.db?.all(sql, params, (err, rows) =>
          err ? reject(err) : resolve((rows ?? []) as T[]),
        );
      });
    const get = <T>(sql: string, params: unknown[] = []) =>
      new Promise<T | undefined>((resolve, reject) => {
        this.db?.get(sql, params, (err, row) =>
          err ? reject(err) : resolve(row as T | undefined),
        );
      });

    const hasColumn = async (table: string, col: string): Promise<boolean> => {
      const rows = await all<{ name: string }>(`PRAGMA table_info(${table})`);
      return rows.some((r) => r.name === col);
    };
    const tableExists = async (name: string): Promise<boolean> => {
      const row = await get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [name],
      );
      return !!row;
    };

    const migrateLatestData = async () => {
      if (!(await tableExists('latest_data'))) {
        await run(
          `CREATE TABLE latest_data (
            pn TEXT NOT NULL PRIMARY KEY,
            json TEXT NOT NULL,
            gts TEXT,
            fetched_at INTEGER NOT NULL
          )`,
        );
        return;
      }
      if (await hasColumn('latest_data', 'pn')) return;
      await run(`CREATE TABLE latest_data_new (
        pn TEXT NOT NULL PRIMARY KEY,
        json TEXT NOT NULL,
        gts TEXT,
        fetched_at INTEGER NOT NULL
      )`);
      await run(
        `INSERT INTO latest_data_new (pn, json, gts, fetched_at)
         SELECT 'default', json, gts, fetched_at FROM latest_data WHERE id = 1`,
      );
      await run('DROP TABLE latest_data');
      await run('ALTER TABLE latest_data_new RENAME TO latest_data');
    };

    const migrateChartData = async () => {
      if (!(await tableExists('chart_data'))) {
        await run(
          `CREATE TABLE chart_data (
            pn TEXT NOT NULL,
            field TEXT NOT NULL,
            ts TEXT NOT NULL,
            val REAL NOT NULL,
            PRIMARY KEY (pn, field, ts)
          )`,
        );
        await run('CREATE INDEX IF NOT EXISTS idx_chart_pn_field_ts ON chart_data(pn, field, ts)');
        return;
      }
      if (await hasColumn('chart_data', 'pn')) return;
      await run(`CREATE TABLE chart_data_new (
        pn TEXT NOT NULL,
        field TEXT NOT NULL,
        ts TEXT NOT NULL,
        val REAL NOT NULL,
        PRIMARY KEY (pn, field, ts)
      )`);
      await run(
        `INSERT INTO chart_data_new (pn, field, ts, val)
         SELECT 'default', field, ts, val FROM chart_data`,
      );
      await run('DROP TABLE chart_data');
      await run('ALTER TABLE chart_data_new RENAME TO chart_data');
      await run('CREATE INDEX IF NOT EXISTS idx_chart_pn_field_ts ON chart_data(pn, field, ts)');
    };

    const migrateKeyParamData = async () => {
      if (!(await tableExists('key_param_data'))) {
        await run(
          `CREATE TABLE key_param_data (
            pn TEXT NOT NULL,
            parameter TEXT NOT NULL,
            ts TEXT NOT NULL,
            val REAL NOT NULL,
            PRIMARY KEY (pn, parameter, ts)
          )`,
        );
        await run(
          'CREATE INDEX IF NOT EXISTS idx_keyparam_pn_param_ts ON key_param_data(pn, parameter, ts)',
        );
        return;
      }
      if (await hasColumn('key_param_data', 'pn')) return;
      await run(`CREATE TABLE key_param_data_new (
        pn TEXT NOT NULL,
        parameter TEXT NOT NULL,
        ts TEXT NOT NULL,
        val REAL NOT NULL,
        PRIMARY KEY (pn, parameter, ts)
      )`);
      await run(
        `INSERT INTO key_param_data_new (pn, parameter, ts, val)
         SELECT 'default', parameter, ts, val FROM key_param_data`,
      );
      await run('DROP TABLE key_param_data');
      await run('ALTER TABLE key_param_data_new RENAME TO key_param_data');
      await run(
        'CREATE INDEX IF NOT EXISTS idx_keyparam_pn_param_ts ON key_param_data(pn, parameter, ts)',
      );
    };

    const migrateDevices = async () => {
      if (await tableExists('devices')) return;
      await run(
        `CREATE TABLE devices (
          pn TEXT NOT NULL,
          sn TEXT NOT NULL,
          devcode TEXT NOT NULL,
          devaddr TEXT NOT NULL,
          devalias TEXT,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (pn, sn)
        )`,
      );
    };

    await migrateLatestData();
    await migrateChartData();
    await migrateKeyParamData();
    await migrateDevices();
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

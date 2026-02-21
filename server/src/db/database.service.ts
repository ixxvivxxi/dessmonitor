import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const DATA_DIR = 'data';
const DB_FILE = 'dessmonitor.db';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private db: Database.Database | null = null;

  getDb(): Database.Database {
    if (!this.db) {
      const dir = join(process.cwd(), DATA_DIR);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const path = join(dir, DB_FILE);
      this.db = new Database(path);
      this.migrate();
    }
    return this.db;
  }

  private migrate(): void {
    const db = this.db!;
    db.exec(`
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
    `);
  }

  onModuleDestroy(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

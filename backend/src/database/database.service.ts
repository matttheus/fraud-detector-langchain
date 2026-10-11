import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    country       TEXT    NOT NULL,
    balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    created_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id    INTEGER NOT NULL REFERENCES accounts (id),
    type          TEXT    NOT NULL CHECK (type IN ('credit', 'payment')),
    amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
    merchant      TEXT,
    category      TEXT,
    country       TEXT,
    status        TEXT    NOT NULL CHECK (status IN ('approved', 'review', 'declined')),
    risk_score    INTEGER,
    fraud_reasons TEXT    NOT NULL DEFAULT '[]',
    reviewed_by   TEXT,
    created_at    TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS transactions_account_id ON transactions (account_id, id);
`;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db = new DatabaseSync(process.env.DATABASE_PATH ?? 'fraud-demo.sqlite');

  constructor() {
    this.db.exec(SCHEMA);
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  onModuleDestroy() {
    this.db.close();
  }
}

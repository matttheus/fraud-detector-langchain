import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { Account, Transaction } from './accounts.types.js';
import { CreateAccountDto } from './accounts.dto.js';

const ACCOUNT_COLUMNS = 'id, name, country, balance_cents AS balanceCents, created_at AS createdAt';

const TRANSACTION_COLUMNS = `
  id, account_id AS accountId, type, amount_cents AS amountCents, merchant, category, country,
  status, risk_score AS riskScore, fraud_reasons AS fraudReasons, reviewed_by AS reviewedBy,
  created_at AS createdAt`;

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

@Injectable()
export class AccountsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  create({ name, country }: CreateAccountDto): Account {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO accounts (name, country, created_at) VALUES (?, ?, ?)')
      .run(name.trim(), country.toUpperCase(), new Date().toISOString());
    return this.get(Number(lastInsertRowid));
  }

  list(): Account[] {
    return this.db.prepare(`SELECT ${ACCOUNT_COLUMNS} FROM accounts ORDER BY id DESC`).all() as unknown as Account[];
  }

  get(id: number): Account {
    const account = this.db.prepare(`SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = ?`).get(id);
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account as unknown as Account;
  }

  addCredits(id: number, amountCents: number): Account {
    this.get(id);
    this.database.transaction(() => {
      this.db.prepare('UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?').run(amountCents, id);
      this.recordTransaction({
        accountId: id,
        type: 'credit',
        amountCents,
        merchant: null,
        category: null,
        country: null,
        status: 'approved',
        riskScore: null,
        fraudReasons: [],
        reviewedBy: null,
      });
    });
    return this.get(id);
  }

  transactions(accountId: number): Transaction[] {
    this.get(accountId);
    const rows = this.db
      .prepare(`SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE account_id = ? ORDER BY id DESC`)
      .all(accountId);
    return rows.map(toTransaction);
  }

  debit(accountId: number, amountCents: number) {
    const { changes } = this.db
      .prepare('UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?')
      .run(amountCents, accountId, amountCents);
    if (changes === 0) throw new BadRequestException('Insufficient balance');
  }

  recordTransaction(txn: NewTransaction): Transaction {
    const { lastInsertRowid } = this.db
      .prepare(
        `INSERT INTO transactions
           (account_id, type, amount_cents, merchant, category, country, status, risk_score, fraud_reasons, reviewed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        txn.accountId,
        txn.type,
        txn.amountCents,
        txn.merchant,
        txn.category,
        txn.country,
        txn.status,
        txn.riskScore,
        JSON.stringify(txn.fraudReasons),
        txn.reviewedBy,
        new Date().toISOString(),
      );
    const row = this.db.prepare(`SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE id = ?`).get(lastInsertRowid);
    return toTransaction(row!);
  }
}

function toTransaction(row: Record<string, unknown>): Transaction {
  return { ...(row as unknown as Transaction), fraudReasons: JSON.parse(row.fraudReasons as string) };
}

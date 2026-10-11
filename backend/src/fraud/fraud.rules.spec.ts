import { describe, expect, it } from 'vitest';
import type { Account, Transaction } from '../accounts/accounts.types.js';
import { PaymentRequest, scorePayment } from './fraud.rules.js';

const now = new Date('2026-10-10T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

const account: Account = { id: 1, name: 'Ana', country: 'US', balanceCents: 50_000, createdAt: minutesAgo(60 * 24 * 30) };

let nextId = 1;
const txn = (overrides: Partial<Transaction>): Transaction => ({
  id: nextId++,
  accountId: 1,
  type: 'payment',
  amountCents: 2_000,
  merchant: 'Whole Foods',
  category: 'groceries',
  country: 'US',
  status: 'approved',
  riskScore: 0,
  fraudReasons: [],
  reviewedBy: 'rules',
  createdAt: minutesAgo(60 * 24 * 7),
  ...overrides,
});

const groceries: PaymentRequest = { amountCents: 3_000, merchant: 'Whole Foods', category: 'groceries', country: 'US' };
const codes = (result: ReturnType<typeof scorePayment>) => result.signals.map((s) => s.code);

describe('scorePayment', () => {
  it('raises nothing for normal spending on an established account', () => {
    expect(scorePayment(groceries, account, [txn({}), txn({})], now)).toEqual({ score: 0, signals: [] });
  });

  it('flags new accounts, foreign countries and high-risk categories', () => {
    const fresh = { ...account, createdAt: minutesAgo(5) };
    const giftCards = { ...groceries, category: 'gift_cards', country: 'NG' };
    expect(codes(scorePayment(giftCards, fresh, [], now))).toEqual(['NEW_ACCOUNT', 'FOREIGN_COUNTRY', 'HIGH_RISK_CATEGORY']);
  });

  it('flags amounts far above the usual spend once there is enough history', () => {
    const history = [txn({}), txn({}), txn({})];
    const big = { ...groceries, amountCents: 20_000 };
    expect(scorePayment(big, account, history, now).signals).toEqual([
      { code: 'AMOUNT_SPIKE', weight: 25, detail: '$200.00 is 10.0x the average payment of $20.00' },
    ]);
    expect(codes(scorePayment(big, account, history.slice(1), now))).toEqual([]);
  });

  it('flags card testing and velocity', () => {
    const history = [
      txn({ amountCents: 100, createdAt: minutesAgo(8) }),
      txn({ amountCents: 50, createdAt: minutesAgo(5) }),
      txn({ amountCents: 4_000, createdAt: minutesAgo(2) }),
    ];
    expect(codes(scorePayment(groceries, account, history, now))).toEqual(['VELOCITY', 'CARD_TESTING']);
  });

  it('flags draining credits that were just added', () => {
    const history = [txn({ type: 'credit', amountCents: 50_000, createdAt: minutesAgo(3) })];
    const drain = { ...groceries, amountCents: 45_000 };
    expect(scorePayment(drain, account, history, now).signals).toEqual([
      { code: 'DRAINS_NEW_CREDIT', weight: 20, detail: 'Spends 90% of the balance shortly after credits were added' },
    ]);
  });

  it('flags accounts with recently blocked payments and caps the score at 100', () => {
    const fresh = { ...account, createdAt: minutesAgo(30) };
    const history = [
      txn({ type: 'credit', amountCents: 50_000, createdAt: minutesAgo(20) }),
      txn({ status: 'declined', amountCents: 100, createdAt: minutesAgo(9) }),
      txn({ status: 'declined', amountCents: 100, createdAt: minutesAgo(6) }),
      txn({ status: 'review', amountCents: 40_000, createdAt: minutesAgo(3) }),
    ];
    const attack = { amountCents: 49_000, merchant: 'CoinFast', category: 'crypto', country: 'RU' };
    const result = scorePayment(attack, fresh, history, now);
    expect(codes(result)).toContain('RECENTLY_BLOCKED');
    expect(result.score).toBe(100);
  });
});

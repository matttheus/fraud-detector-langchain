import type { Account, Transaction } from '../accounts/accounts.types.js';

export type PaymentRequest = {
  amountCents: number;
  merchant: string;
  category: string;
  country: string;
};

export type RiskSignal = {
  code: string;
  weight: number;
  detail: string;
};

export const HIGH_RISK_CATEGORIES = new Set(['gift_cards', 'crypto', 'wire_transfer']);

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;

export const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const minutesBetween = (isoDate: string, now: Date) => (now.getTime() - Date.parse(isoDate)) / MINUTE_MS;

export function scorePayment(
  payment: PaymentRequest,
  account: Account,
  history: Transaction[],
  now = new Date(),
): { score: number; signals: RiskSignal[] } {
  const signals: RiskSignal[] = [];
  const flag = (code: string, weight: number, detail: string) => signals.push({ code, weight, detail });
  const minutesAgo = (t: { createdAt: string }) => minutesBetween(t.createdAt, now);

  const payments = history.filter((t) => t.type === 'payment');
  const approved = payments.filter((t) => t.status === 'approved');

  if (minutesAgo(account) < DAY_MINUTES) {
    flag('NEW_ACCOUNT', 10, 'Account was created less than a day ago');
  }
  if (payment.country !== account.country) {
    flag('FOREIGN_COUNTRY', 15, `Payment in ${payment.country}, account is based in ${account.country}`);
  }
  if (HIGH_RISK_CATEGORIES.has(payment.category)) {
    flag('HIGH_RISK_CATEGORY', 20, `"${payment.category}" purchases are easy to cash out`);
  }

  if (approved.length >= 3) {
    const average = approved.reduce((sum, t) => sum + t.amountCents, 0) / approved.length;
    if (payment.amountCents > average * 5) {
      const ratio = (payment.amountCents / average).toFixed(1);
      flag('AMOUNT_SPIKE', 25, `${formatCents(payment.amountCents)} is ${ratio}x the average payment of ${formatCents(average)}`);
    }
  }

  const lastTenMinutes = payments.filter((t) => minutesAgo(t) <= 10);
  if (lastTenMinutes.length >= 3) {
    flag('VELOCITY', 20, `${lastTenMinutes.length} payments in the last 10 minutes`);
  }

  const tinyPayments = payments.filter((t) => t.amountCents <= 100 && minutesAgo(t) <= 60);
  if (tinyPayments.length >= 2) {
    flag('CARD_TESTING', 25, `${tinyPayments.length} payments of $1 or less in the last hour`);
  }

  const freshCredit = history.some((t) => t.type === 'credit' && minutesAgo(t) <= 30);
  if (freshCredit && payment.amountCents >= account.balanceCents * 0.8) {
    const share = Math.round((payment.amountCents / account.balanceCents) * 100);
    flag('DRAINS_NEW_CREDIT', 20, `Spends ${share}% of the balance shortly after credits were added`);
  }

  const blocked = payments.filter((t) => t.status !== 'approved' && minutesAgo(t) <= DAY_MINUTES);
  if (blocked.length > 0) {
    flag('RECENTLY_BLOCKED', 20, `${blocked.length} payment(s) declined or held in the last 24 hours`);
  }

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
  return { score, signals };
}

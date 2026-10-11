import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { historyToolCall, ScriptedChatModel, verdictReply } from '../../test/scripted-chat-model.js';
import type { Account, Transaction } from '../accounts/accounts.types.js';
import { FraudService } from './fraud.service.js';

const now = Date.now();
const account: Account = { id: 1, name: 'Ana', country: 'US', balanceCents: 50_000, createdAt: new Date(now - 5 * 60_000).toISOString() };
const credit: Transaction = {
  id: 1,
  accountId: 1,
  type: 'credit',
  amountCents: 50_000,
  merchant: null,
  category: null,
  country: null,
  status: 'approved',
  riskScore: null,
  fraudReasons: [],
  reviewedBy: null,
  createdAt: new Date(now - 60_000).toISOString(),
};

const groceries = { amountCents: 3_000, merchant: 'Whole Foods', category: 'groceries', country: 'US' };
const giftCards = { amountCents: 45_000, merchant: 'GiftCardMall', category: 'gift_cards', country: 'NG' };

describe('FraudService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('approves low-risk payments with the rules alone', async () => {
    const createModel = vi.fn();
    const review = await new FraudService(createModel).review({ account, payment: groceries, history: [credit] });

    expect(review).toEqual({ decision: 'approve', riskScore: 10, reasons: ['Account was created less than a day ago'], reviewedBy: 'rules' });
    expect(createModel).not.toHaveBeenCalled();
  });

  it('sends flagged payments to the LLM, which can look up the history', async () => {
    const verdict = { decision: 'decline', riskScore: 92.6, reasons: ['Fresh credits drained into gift cards abroad'] };
    const model = new ScriptedChatModel([historyToolCall({ lastMinutes: 60 }), verdictReply(verdict)]);

    const review = await new FraudService(() => model).review({ account, payment: giftCards, history: [credit] });

    expect(review).toEqual({ ...verdict, riskScore: 93, reviewedBy: 'llm' });
    expect(model.calls).toBe(2);
  });

  it('holds flagged payments for manual review when the LLM fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const failing = () => {
      throw new Error('Anthropic API key not found');
    };

    const review = await new FraudService(failing).review({ account, payment: giftCards, history: [credit] });

    expect(review.decision).toBe('escalate');
    expect(review.reviewedBy).toBe('rules');
    expect(review.reasons.at(-1)).toBe('Automatic review unavailable, held for manual review');
  });
});

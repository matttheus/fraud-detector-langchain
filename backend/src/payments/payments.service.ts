import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service.js';
import type { Account, Transaction, TransactionStatus } from '../accounts/accounts.types.js';
import { DatabaseService } from '../database/database.service.js';
import { FraudReview, FraudService } from '../fraud/fraud.service.js';
import { CreatePaymentDto } from './payments.dto.js';

const STATUS_BY_DECISION: Record<FraudReview['decision'], TransactionStatus> = {
  approve: 'approved',
  escalate: 'review',
  decline: 'declined',
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly accounts: AccountsService,
    private readonly fraud: FraudService,
  ) {}

  async pay(accountId: number, dto: CreatePaymentDto): Promise<{ transaction: Transaction; account: Account }> {
    const account = this.accounts.get(accountId);
    if (account.balanceCents < dto.amountCents) throw new BadRequestException('Insufficient balance');

    const payment = { ...dto, merchant: dto.merchant.trim(), country: dto.country.toUpperCase() };
    const review = await this.fraud.review({ account, payment, history: this.accounts.transactions(accountId) });

    const transaction = this.database.transaction(() => {
      if (review.decision === 'approve') this.accounts.debit(accountId, payment.amountCents);
      return this.accounts.recordTransaction({
        accountId,
        type: 'payment',
        ...payment,
        status: STATUS_BY_DECISION[review.decision],
        riskScore: review.riskScore,
        fraudReasons: review.reasons,
        reviewedBy: review.reviewedBy,
      });
    });

    return { transaction, account: this.accounts.get(accountId) };
  }
}

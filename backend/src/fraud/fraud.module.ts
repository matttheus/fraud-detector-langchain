import { Module } from '@nestjs/common';
import { ChatAnthropic } from '@langchain/anthropic';
import { FRAUD_MODEL, FraudModelFactory, FraudService } from './fraud.service.js';

const createAnthropicModel: FraudModelFactory = () =>
  new ChatAnthropic({
    model: process.env.FRAUD_MODEL ?? 'claude-opus-5-5',
    betas: ['server-side-fallback-2026-07-01'],
    invocationKwargs: { fallbacks: 'default' },
  });

@Module({
  providers: [FraudService, { provide: FRAUD_MODEL, useValue: createAnthropicModel }],
  exports: [FraudService],
})
export class FraudModule {}

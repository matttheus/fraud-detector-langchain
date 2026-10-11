import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { FRAUD_MODEL } from '../src/fraud/fraud.service.js';
import { ScriptedChatModel, verdictReply } from './scripted-chat-model.js';

describe('Accounts and payments (e2e)', () => {
  let app: INestApplication<App>;
  let model: ScriptedChatModel;

  beforeEach(async () => {
    model = new ScriptedChatModel([
      verdictReply({ decision: 'decline', riskScore: 95, reasons: ['Fresh credits drained into gift cards abroad'] }),
    ]);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FRAUD_MODEL)
      .useValue(() => model)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const api = () => request(app.getHttpServer());

  it('creates an account, adds credits and runs fraud checks on payments', async () => {
    const { body: account } = await api().post('/accounts').send({ name: 'Ana', country: 'us' }).expect(201);
    expect(account).toMatchObject({ name: 'Ana', country: 'US', balanceCents: 0 });

    const { body: credited } = await api().post(`/accounts/${account.id}/credits`).send({ amountCents: 50_000 }).expect(201);
    expect(credited.balanceCents).toBe(50_000);

    const groceries = { amountCents: 4_000, merchant: 'Whole Foods', category: 'groceries', country: 'US' };
    const { body: approved } = await api().post(`/accounts/${account.id}/payments`).send(groceries).expect(201);
    expect(approved.transaction).toMatchObject({ status: 'approved', reviewedBy: 'rules' });
    expect(approved.account.balanceCents).toBe(46_000);
    expect(model.calls).toBe(0);

    const giftCards = { amountCents: 45_000, merchant: 'GiftCardMall', category: 'gift_cards', country: 'NG' };
    const { body: declined } = await api().post(`/accounts/${account.id}/payments`).send(giftCards).expect(201);
    expect(declined.transaction).toMatchObject({
      status: 'declined',
      riskScore: 95,
      reviewedBy: 'llm',
      fraudReasons: ['Fresh credits drained into gift cards abroad'],
    });
    expect(declined.account.balanceCents).toBe(46_000);
    expect(model.calls).toBe(1);

    const { body: history } = await api().get(`/accounts/${account.id}/transactions`).expect(200);
    expect(history.map((t: { type: string; status: string }) => `${t.type}:${t.status}`)).toEqual([
      'payment:declined',
      'payment:approved',
      'credit:approved',
    ]);
  });

  it('rejects payments the balance cannot cover', async () => {
    const { body: account } = await api().post('/accounts').send({ name: 'Bo', country: 'PT' }).expect(201);
    const payment = { amountCents: 100, merchant: 'Pingo Doce', category: 'groceries', country: 'PT' };

    const { body } = await api().post(`/accounts/${account.id}/payments`).send(payment).expect(400);
    expect(body.message).toBe('Insufficient balance');
  });

  it('validates input', async () => {
    await api().post('/accounts').send({ name: '', country: 'Narnia' }).expect(400);
    await api().get('/accounts/999').expect(404);

    const { body: account } = await api().post('/accounts').send({ name: 'Cy', country: 'BR' }).expect(201);
    await api()
      .post(`/accounts/${account.id}/payments`)
      .send({ amountCents: 10.5, merchant: 'X', category: 'lottery', country: 'BR' })
      .expect(400);
  });
});

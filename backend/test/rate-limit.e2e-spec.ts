import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  async function start(env: Record<string, string>) {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  }

  const api = () => request(app.getHttpServer());

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('allows RATE_LIMIT_PER_DAY requests per IP across all endpoints, then answers 429', async () => {
    await start({ RATE_LIMIT_PER_DAY: '3' });

    const first = await api().get('/accounts').expect(200);
    expect(first.headers['x-ratelimit-limit']).toBe('3');
    expect(first.headers['x-ratelimit-remaining']).toBe('2');
    await api().post('/accounts').send({ name: 'Ana', country: 'US' }).expect(201);
    await api().get('/accounts/1').expect(200);

    const blocked = await api().get('/accounts').expect(429);
    expect(blocked.body.message).toBe('Daily request limit reached for your IP address. Try again tomorrow.');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('limits each client separately by the IP the proxy forwards', async () => {
    await start({ RATE_LIMIT_PER_DAY: '1' });

    await api().get('/accounts').set('X-Forwarded-For', '203.0.113.1').expect(200);
    await api().get('/accounts').set('X-Forwarded-For', '203.0.113.1').expect(429);
    await api().get('/accounts').set('X-Forwarded-For', '203.0.113.2').expect(200);
  });

  it('ignores X-Forwarded-For entries a client adds before the proxy, so they cannot dodge the limit', async () => {
    await start({ RATE_LIMIT_PER_DAY: '1' });

    await api().get('/accounts').set('X-Forwarded-For', '10.0.0.1, 198.51.100.7').expect(200);
    await api().get('/accounts').set('X-Forwarded-For', '10.0.0.2, 198.51.100.7').expect(429);
  });
});

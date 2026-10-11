import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module.js';
import { DatabaseModule } from './database/database.module.js';
import { PaymentsModule } from './payments/payments.module.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ ttl: DAY_MS, limit: Number(process.env.RATE_LIMIT_PER_DAY ?? 1000) }],
        generateKey: (_context, tracker, throttlerName) => `${throttlerName}:${tracker}`,
        errorMessage: 'Daily request limit reached for your IP address. Try again tomorrow.',
      }),
    }),
    DatabaseModule,
    AccountsModule,
    PaymentsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

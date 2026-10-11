import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module.js';
import { FraudModule } from '../fraud/fraud.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [AccountsModule, FraudModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}

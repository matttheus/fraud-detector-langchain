import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreatePaymentDto } from './payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('accounts/:id/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePaymentDto) {
    return this.payments.pay(id, dto);
  }
}

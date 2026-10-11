import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AddCreditsDto, CreateAccountDto } from './accounts.dto.js';
import { AccountsService } from './accounts.service.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Get()
  list() {
    return this.accounts.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.accounts.get(id);
  }

  @Post(':id/credits')
  addCredits(@Param('id', ParseIntPipe) id: number, @Body() dto: AddCreditsDto) {
    return this.accounts.addCredits(id, dto.amountCents);
  }

  @Get(':id/transactions')
  transactions(@Param('id', ParseIntPipe) id: number) {
    return this.accounts.transactions(id);
  }
}

import { IsIn, IsISO31661Alpha2, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export const CATEGORIES = [
  'groceries',
  'restaurants',
  'fuel',
  'electronics',
  'travel',
  'gaming',
  'streaming',
  'gift_cards',
  'crypto',
  'wire_transfer',
] as const;

export class CreatePaymentDto {
  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  merchant: string;

  @IsIn(CATEGORIES)
  category: string;

  @IsISO31661Alpha2()
  country: string;
}

import { IsISO31661Alpha2, IsInt, IsNotEmpty, IsPositive, IsString, Max, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsISO31661Alpha2()
  country: string;
}

export class AddCreditsDto {
  @IsInt()
  @IsPositive()
  @Max(1_000_000_00)
  amountCents: number;
}

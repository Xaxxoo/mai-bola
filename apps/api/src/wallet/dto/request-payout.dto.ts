import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsObject, Min } from 'class-validator';
import { PayoutMethod } from '../../enums';

export class RequestPayoutDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  amount: number;

  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @IsObject()
  destination: Record<string, unknown>;
}

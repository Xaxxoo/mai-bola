import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvanceBatchDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  processedKg: number;
}

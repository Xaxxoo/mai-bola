import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CollectDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  actualKg: number;
}

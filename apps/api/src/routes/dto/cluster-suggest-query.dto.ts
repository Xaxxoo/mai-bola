import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';

export class ClusterSuggestQueryDto {
  @IsIn(KADUNA_ZONES as unknown as string[])
  zone: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

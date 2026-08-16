import { IsString, IsOptional } from 'class-validator';

export class SkipStopDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

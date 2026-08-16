import { IsOptional, IsString } from 'class-validator';

export class CancelPickupRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

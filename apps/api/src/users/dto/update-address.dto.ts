import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  streetText?: string;

  @IsOptional()
  @IsIn(KADUNA_ZONES as unknown as string[])
  zone?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

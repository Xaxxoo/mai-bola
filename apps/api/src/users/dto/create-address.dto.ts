import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';

export class CreateAddressDto {
  @IsString()
  label: string;

  @IsString()
  streetText: string;

  @IsIn(KADUNA_ZONES as unknown as string[])
  zone: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

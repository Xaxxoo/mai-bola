import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SupplierType } from '../../enums';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;
}

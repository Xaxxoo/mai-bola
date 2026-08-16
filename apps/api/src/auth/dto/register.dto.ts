import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SupplierType } from '../../enums';
import { normalizeNigerianPhone } from '../../common/utils/normalize-phone';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    try {
      return normalizeNigerianPhone(value);
    } catch {
      return value; // let validation handle invalid phones
    }
  })
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(SupplierType)
  supplierType: SupplierType;
}

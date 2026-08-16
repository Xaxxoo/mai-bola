import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../enums';
import { normalizeNigerianPhone } from '../../common/utils/normalize-phone';

export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    try {
      return normalizeNigerianPhone(value);
    } catch {
      return value;
    }
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole, {
    message: 'role must be DRIVER or ADMIN',
  })
  role: UserRole;
}

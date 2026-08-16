import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeNigerianPhone } from '../../common/utils/normalize-phone';

export class LoginDto {
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
  password: string;
}

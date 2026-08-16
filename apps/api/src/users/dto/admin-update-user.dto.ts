import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../enums';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

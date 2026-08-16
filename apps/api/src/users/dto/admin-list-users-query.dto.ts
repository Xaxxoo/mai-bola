import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { UserRole, SupplierType } from '../../enums';
import { PaginationQueryDto } from '../../common/dto';

export class AdminListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @IsIn(KADUNA_ZONES as unknown as string[])
  zone?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

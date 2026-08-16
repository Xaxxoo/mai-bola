import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';
import { PickupRequestStatus } from '../../enums';
import { PaginationQueryDto } from '../../common/dto';

export class ListAdminPickupsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PickupRequestStatus)
  status?: PickupRequestStatus;

  @IsOptional()
  @IsIn(KADUNA_ZONES as unknown as string[])
  zone?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

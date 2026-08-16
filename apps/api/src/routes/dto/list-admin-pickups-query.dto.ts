import { IsEnum, IsIn, IsOptional } from 'class-validator';
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
}

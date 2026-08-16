import { IsEnum, IsOptional } from 'class-validator';
import { PickupRequestStatus } from '../../enums';
import { PaginationQueryDto } from '../../common/dto';

export class ListPickupRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PickupRequestStatus)
  status?: PickupRequestStatus;
}

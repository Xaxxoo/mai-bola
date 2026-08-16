import { IsEnum, IsOptional } from 'class-validator';
import { PayoutStatus } from '../../enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListPayoutsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

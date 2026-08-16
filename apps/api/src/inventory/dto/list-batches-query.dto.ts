import { IsEnum, IsOptional } from 'class-validator';
import { InventoryBatchStatus } from '../../enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListBatchesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InventoryBatchStatus)
  status?: InventoryBatchStatus;
}

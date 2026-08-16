import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RouteStatus } from '../../enums';
import { PaginationQueryDto } from '../../common/dto';

export class ListRoutesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;
}

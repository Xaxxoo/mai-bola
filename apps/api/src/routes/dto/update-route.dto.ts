import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator';

export class UpdateRouteDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  pickupRequestIds?: string[];
}

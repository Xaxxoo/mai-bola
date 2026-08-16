import { ArrayMinSize, IsArray, IsDateString, IsIn, IsString, IsUUID } from 'class-validator';
import { KADUNA_ZONES } from '@mai-bola/shared';

export class CreateRouteDto {
  @IsString()
  name: string;

  @IsIn(KADUNA_ZONES as unknown as string[])
  zone: string;

  @IsDateString()
  scheduledDate: string;

  @IsUUID()
  driverId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  pickupRequestIds: string[];
}

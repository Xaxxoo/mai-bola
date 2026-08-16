import { IsArray, IsUUID } from 'class-validator';

export class CreateBatchDto {
  @IsArray()
  @IsUUID('4', { each: true })
  collectionIds: string[];
}

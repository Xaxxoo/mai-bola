import { IsString } from 'class-validator';

export class MarkPaidDto {
  @IsString()
  reference: string;
}

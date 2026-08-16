import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum TimeseriesMetric {
  KG_COLLECTED = 'kg_collected',
  NAIRA_PAID = 'naira_paid',
  KG_SOLD = 'kg_sold',
}

export enum TimeseriesInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class TimeseriesQueryDto {
  @IsEnum(TimeseriesMetric)
  metric: TimeseriesMetric;

  @IsEnum(TimeseriesInterval)
  interval: TimeseriesInterval;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { MetricsService } from './metrics.service';
import { TimeseriesQueryDto } from './dto';

@ApiTags('Admin Metrics')
@Controller('admin/metrics')
@Roles(UserRole.ADMIN)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('overview')
  getOverview() {
    return this.metricsService.getOverview();
  }

  @Get('timeseries')
  getTimeseries(@Query() query: TimeseriesQueryDto) {
    return this.metricsService.getTimeseries(query);
  }
}

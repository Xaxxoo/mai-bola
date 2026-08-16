import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { MetricsService } from './metrics.service';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedResult: any = null;
let cachedAt = 0;

@ApiTags('Public Metrics')
@Controller('metrics')
export class PublicMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get('public')
  async getPublicMetrics() {
    const now = Date.now();
    if (cachedResult && now - cachedAt < CACHE_TTL_MS) {
      return cachedResult;
    }
    cachedResult = await this.metricsService.getPublicMetrics();
    cachedAt = now;
    return cachedResult;
  }
}

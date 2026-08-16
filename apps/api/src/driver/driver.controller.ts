import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { DriverService } from './driver.service';
import { CollectDto, SkipStopDto } from './dto';

@ApiTags('Driver')
@Controller('driver')
@Roles(UserRole.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('routes/today')
  getToday(@Req() req: any) {
    return this.driverService.getToday(req.user.sub);
  }

  @Post('routes/:id/start')
  start(@Param('id') id: string, @Req() req: any) {
    return this.driverService.startRoute(id, req.user.sub);
  }

  @Post('stops/:id/arrive')
  arrive(
    @Param('id') id: string,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.driverService.arriveStop(id, req.user.sub, idempotencyKey);
  }

  @Post('stops/:id/collect')
  collect(
    @Param('id') id: string,
    @Body() dto: CollectDto,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.driverService.collectStop(id, req.user.sub, dto, idempotencyKey);
  }

  @Post('stops/:id/skip')
  skip(
    @Param('id') id: string,
    @Body() dto: SkipStopDto,
    @Req() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.driverService.skipStop(id, req.user.sub, dto, idempotencyKey);
  }

  @Post('routes/:id/complete')
  complete(@Param('id') id: string, @Req() req: any) {
    return this.driverService.completeRoute(id, req.user.sub);
  }
}

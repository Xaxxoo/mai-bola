import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PickupRequestsService } from './pickup-requests.service';
import {
  CreatePickupRequestDto,
  ListPickupRequestsQueryDto,
  CancelPickupRequestDto,
} from './dto';

@ApiTags('Pickup Requests')
@Controller('pickup-requests')
export class PickupRequestsController {
  constructor(private readonly service: PickupRequestsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreatePickupRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('mine')
  listMine(@Request() req: any, @Query() query: ListPickupRequestsQueryDto) {
    return this.service.listMine(req.user.id, query);
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, req.user.id, req.user.role);
  }

  @Post(':id/cancel')
  cancel(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPickupRequestDto,
  ) {
    return this.service.cancel(id, req.user.id, dto);
  }
}

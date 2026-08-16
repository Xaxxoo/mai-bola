import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { RoutesService } from './routes.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
  ListRoutesQueryDto,
  ListAdminPickupsQueryDto,
  ClusterSuggestQueryDto,
} from './dto';

@ApiTags('Admin Routes')
@Controller('admin')
@Roles(UserRole.ADMIN)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  // --- Pickup worklist ---

  @Get('pickup-requests')
  listPickups(@Query() query: ListAdminPickupsQueryDto) {
    return this.routesService.listAdminPickups(query);
  }

  // --- Cluster suggestion ---

  @Get('clusters/suggest')
  suggestClusters(@Query() query: ClusterSuggestQueryDto) {
    return this.routesService.suggestClusters(query);
  }

  // --- Routes ---

  @Post('routes')
  createRoute(@Request() req: any, @Body() dto: CreateRouteDto) {
    return this.routesService.createRoute(dto, req.user.id);
  }

  @Get('routes')
  listRoutes(@Query() query: ListRoutesQueryDto) {
    return this.routesService.listRoutes(query);
  }

  @Get('routes/:id')
  getRoute(@Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.getRoute(id);
  }

  @Patch('routes/:id')
  updateRoute(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.routesService.updateRoute(id, dto, req.user.id);
  }

  @Post('routes/:id/auto-order')
  autoOrder(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.autoOrder(id, req.user.id);
  }

  @Post('routes/:id/dispatch')
  dispatch(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.routesService.dispatch(id, req.user.id);
  }
}

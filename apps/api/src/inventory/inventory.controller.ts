import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { InventoryService } from './inventory.service';
import {
  CreateBatchDto,
  AdvanceBatchDto,
  ListBatchesQueryDto,
  CreateSaleDto,
  ListSalesQueryDto,
  UpdateEconomicsDto,
} from './dto';

@ApiTags('Admin Inventory')
@Controller('admin')
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Batches ──────────────────────────────────────

  @Post('batches')
  createBatch(@Body() dto: CreateBatchDto, @Req() req: any) {
    return this.inventoryService.createBatch(dto, req.user.sub);
  }

  @Patch('batches/:id/status')
  advanceBatch(
    @Param('id') id: string,
    @Body() dto: AdvanceBatchDto,
    @Req() req: any,
  ) {
    return this.inventoryService.advanceBatch(id, dto, req.user.sub);
  }

  @Get('batches')
  listBatches(@Query() query: ListBatchesQueryDto) {
    return this.inventoryService.listBatches(query);
  }

  // ── Sales ────────────────────────────────────────

  @Post('sales')
  createSale(@Body() dto: CreateSaleDto, @Req() req: any) {
    return this.inventoryService.createSale(dto, req.user.sub);
  }

  @Get('sales')
  listSales(@Query() query: ListSalesQueryDto) {
    return this.inventoryService.listSales(query);
  }

  // ── Economics ────────────────────────────────────

  @Get('economics/defaults')
  getDefaults() {
    return this.inventoryService.getDefaults();
  }

  @Patch('economics/defaults')
  updateDefaults(@Body() dto: UpdateEconomicsDto, @Req() req: any) {
    return this.inventoryService.updateDefaults(dto, req.user.sub);
  }
}

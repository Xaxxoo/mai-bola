import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { WalletService } from './wallet.service';
import { ListPayoutsQueryDto, RejectPayoutDto, MarkPaidDto } from './dto';

@ApiTags('Admin Payouts')
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminPayoutsController {
  constructor(private readonly walletService: WalletService) {}

  @Get('payouts')
  listPayouts(@Query() query: ListPayoutsQueryDto) {
    return this.walletService.listPayouts(query);
  }

  @Post('payouts/:id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.walletService.approvePayout(id, req.user.sub);
  }

  @Post('payouts/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPayoutDto,
    @Req() req: any,
  ) {
    return this.walletService.rejectPayout(id, req.user.sub, dto);
  }

  @Post('payouts/:id/mark-paid')
  markPaid(
    @Param('id') id: string,
    @Body() dto: MarkPaidDto,
    @Req() req: any,
  ) {
    return this.walletService.markPaid(id, req.user.sub, dto);
  }

  @Get('wallet-summary')
  getWalletSummary() {
    return this.walletService.getWalletSummary();
  }
}

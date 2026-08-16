import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators';
import { UserRole } from '../enums';
import { WalletService } from './wallet.service';
import { RequestPayoutDto, ListTransactionsQueryDto } from './dto';

@ApiTags('Wallet')
@Controller()
@Roles(UserRole.SUPPLIER)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallet')
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.sub);
  }

  @Get('wallet/transactions')
  listTransactions(
    @Req() req: any,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.walletService.listTransactions(req.user.sub, query);
  }

  @Post('payouts')
  requestPayout(@Req() req: any, @Body() dto: RequestPayoutDto) {
    return this.walletService.requestPayout(req.user.sub, dto);
  }
}

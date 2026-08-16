import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.sub);
  }

  @Get('vapid-public-key')
  vapidKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null };
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.service.markRead(req.user.sub, id);
  }

  @Post('push-subscription')
  subscribe(@Req() req: any, @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return this.service.saveSubscription(req.user.sub, body);
  }

  @Delete('push-subscription')
  unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    return this.service.removeSubscription(req.user.sub, body.endpoint);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';
import { Notification } from '../entities/notification.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import { NotificationType } from '../enums';
import { EntityManager } from 'typeorm';

type SubscriptionBody = { endpoint: string; keys: { p256dh: string; auth: string } };

@Injectable()
export class NotificationsService {
  private readonly pushReady: boolean;

  constructor(
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(PushSubscription) private readonly subscriptionRepo: Repository<PushSubscription>,
  ) {
    this.pushReady = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    if (this.pushReady) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:ops@mai-bola.com',
        process.env.VAPID_PUBLIC_KEY as string,
        process.env.VAPID_PRIVATE_KEY as string,
      );
    }
  }

  async createInTransaction(manager: EntityManager, input: {
    userId: string; type: NotificationType; title: string; body: string; data?: Record<string, unknown>;
  }) {
    const notification = manager.getRepository(Notification).create({ ...input, data: input.data || {}, readAt: null });
    return manager.getRepository(Notification).save(notification);
  }

  async list(userId: string) {
    const data = await this.notificationRepo.find({
      where: { userId }, order: { createdAt: 'DESC' }, take: 50,
    });
    return { data, unreadCount: data.filter((item) => !item.readAt).length };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.readAt = notification.readAt || new Date();
    return this.notificationRepo.save(notification);
  }

  async saveSubscription(userId: string, body: SubscriptionBody) {
    const existing = await this.subscriptionRepo.findOne({ where: { userId, endpoint: body.endpoint } });
    const subscription = existing || this.subscriptionRepo.create({ userId, endpoint: body.endpoint });
    subscription.p256dh = body.keys.p256dh;
    subscription.auth = body.keys.auth;
    return this.subscriptionRepo.save(subscription);
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.subscriptionRepo.delete({ userId, endpoint });
    return { success: true };
  }

  async sendPush(userId: string, title: string, body: string, data: Record<string, unknown> = {}) {
    if (!this.pushReady) return;
    const subscriptions = await this.subscriptionRepo.find({ where: { userId } });
    await Promise.all(subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify({ title, body, data }));
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await this.subscriptionRepo.delete(item.id);
      }
    }));
  }
}

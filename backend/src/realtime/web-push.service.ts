import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { WebPushSubscription } from './entities/web-push-subscription.entity';

export interface WebPushPayload {
  title: string;
  body: string;
  /** Icon URL (absolute) */
  icon?: string;
  /** Badge URL (absolute) */
  badge?: string;
  /** Arbitrary data forwarded to the service worker */
  data?: Record<string, unknown>;
  /** Click action URL */
  url?: string;
}

export interface SaveSubscriptionDto {
  subscriberType: 'client' | 'medic';
  subscriberId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WebPushSubscription)
    private readonly subRepo: Repository<WebPushSubscription>,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:admin@hamshirago.uz';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — web push notifications are disabled. ' +
        'Generate keys with: npx web-push generate-vapid-keys',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('VAPID keys configured — web push is ready');
  }

  getVapidPublicKey(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }

  /** Save or refresh a browser subscription. Uses endpoint as unique key. */
  async saveSubscription(dto: SaveSubscriptionDto): Promise<void> {
    const existing = await this.subRepo.findOne({ where: { endpoint: dto.endpoint } });

    if (existing) {
      // Update keys in case they rotated (browser can re-subscribe same endpoint)
      await this.subRepo.update(existing.id, {
        p256dh: dto.p256dh,
        auth: dto.auth,
        subscriberType: dto.subscriberType,
        subscriberId: dto.subscriberId,
        userAgent: dto.userAgent ?? existing.userAgent,
      });
    } else {
      await this.subRepo.save(
        this.subRepo.create({
          subscriberType: dto.subscriberType,
          subscriberId: dto.subscriberId,
          endpoint: dto.endpoint,
          p256dh: dto.p256dh,
          auth: dto.auth,
          userAgent: dto.userAgent ?? null,
        }),
      );
    }
  }

  /** Remove a subscription (browser called pushManager.unsubscribe()) */
  async removeSubscription(endpoint: string): Promise<void> {
    await this.subRepo.delete({ endpoint });
  }

  /** Send to all web subscriptions of a specific user/medic */
  async sendToSubscriber(
    subscriberType: 'client' | 'medic',
    subscriberId: string,
    payload: WebPushPayload,
  ): Promise<void> {
    if (!this.config.get('VAPID_PUBLIC_KEY')) return;

    const subs = await this.subRepo.find({ where: { subscriberType, subscriberId } });
    if (!subs.length) return;

    const payloadStr = JSON.stringify(payload);
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payloadStr,
            { TTL: 86400 }, // keep in push service queue up to 24 h
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Subscription expired or unsubscribed — clean up
            stale.push(sub.endpoint);
          } else {
            this.logger.warn(`Web push failed for ${sub.endpoint}: ${String(err)}`);
          }
        }
      }),
    );

    if (stale.length) {
      await this.subRepo.delete(stale.map((endpoint) => ({ endpoint })));
      this.logger.log(`Removed ${stale.length} stale web push subscription(s)`);
    }

    const sent = subs.length - stale.length;
    if (sent > 0) this.logger.log(`Sent web push to ${sent} browser(s) [${subscriberType} ${subscriberId}]`);
  }

  /** Broadcast to all subscriptions of a given type (e.g. all medics) */
  async broadcast(
    subscriberType: 'client' | 'medic',
    payload: WebPushPayload,
  ): Promise<void> {
    if (!this.config.get('VAPID_PUBLIC_KEY')) return;

    const subs = await this.subRepo.find({ where: { subscriberType } });
    if (!subs.length) return;

    const payloadStr = JSON.stringify(payload);
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payloadStr,
            { TTL: 3600 },
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) stale.push(sub.endpoint);
        }
      }),
    );

    if (stale.length) await this.subRepo.delete(stale.map((endpoint) => ({ endpoint })));
    this.logger.log(`Broadcast web push to ${subs.length - stale.length} browser(s)`);
  }
}

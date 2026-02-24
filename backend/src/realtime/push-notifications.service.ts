import { Injectable, Logger } from '@nestjs/common';

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  sound?: 'default' | null;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send push notifications to a list of Expo push tokens.
   * Uses the Expo Push Notifications API — works with Expo Go and production builds.
   */
  async send(tokens: string[], message: Omit<ExpoPushMessage, 'to'>): Promise<void> {
    if (!tokens.length) return;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({ to, ...message }));

    try {
      const res = await fetch(PushNotificationsService.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.warn(`Expo push API responded with ${res.status}`);
        return;
      }

      const result = (await res.json()) as { data: { status: string; id?: string }[] };
      const failed = result.data?.filter((r) => r.status !== 'ok') ?? [];
      if (failed.length) {
        this.logger.warn(`${failed.length} push(es) failed: ${JSON.stringify(failed)}`);
      } else {
        this.logger.log(`Sent ${tokens.length} push notification(s)`);
      }
    } catch (err) {
      this.logger.error('Failed to send push notifications', err);
    }
  }
}

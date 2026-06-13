import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PushTokensService } from './push-tokens/push-tokens.service';

@Injectable()
export class PushService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly pushTokensService: PushTokensService) {}

  async sendToUser(
    userId: number,
    data: {
      title: string;
      body?: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    const tokens = await this.pushTokensService.findByUser(userId);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];

    for (const t of tokens) {
      if (!Expo.isExpoPushToken(t.token)) {
        this.logger.warn(`Invalid Expo push token for user ${userId}: ${t.token}`);
        continue;
      }

      messages.push({
        to: t.token,
        sound: 'default',
        title: data.title,
        body: data.body,
        data: data.data ?? {},
      });
    }

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(`Push sent to user ${userId}: ${JSON.stringify(receipts)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send push to user ${userId}`, error);
    }
  }
}

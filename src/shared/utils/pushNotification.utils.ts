import { Injectable } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { GlobalConfigService } from '../config/global.config';
import { LoggerService } from '../config/loggerService.config';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushNotificationService {
  constructor(
    private readonly config: GlobalConfigService,
    private readonly logger: LoggerService,
  ) {
    if (getApps().length === 0) {
      const { projectId, clientEmail, privateKey } = this.config.firebase;
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  }

  /**
   * Sends a push notification to a set of FCM device tokens.
   * Never throws — a push failure shouldn't break the caller (a request or a cron tick).
   */
  async sendToTokens(tokens: string[], notification: PushNotificationPayload): Promise<{ invalidTokens: string[] }> {
    if (tokens.length === 0) return { invalidTokens: [] };

    const invalidTokens: string[] = [];

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      });

      response.responses.forEach((res, i) => {
        if (!res.success) {
          const code = res.error?.code;
          if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
            invalidTokens.push(tokens[i]);
          } else {
            this.logger.error(`FCM send failed for token ${tokens[i]}`, res.error);
          }
        }
      });

      this.logger.info(`FCM: sent to ${response.successCount}/${tokens.length} tokens (${response.failureCount} failed)`);
    } catch (error) {
      this.logger.error('FCM: sendEachForMulticast failed', error);
    }

    return { invalidTokens };
  }
}

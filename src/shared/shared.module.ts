import { Global, Module } from '@nestjs/common';
import { GlobalConfigService } from './config/global.config';
import { LoggerService } from './config/loggerService.config';
import { JwtService } from './config/jwt.config';
import { PasswordUtils } from './utils/password.utils';
import { EmailService } from './utils/email.utils';
import { PushNotificationService } from './utils/pushNotification.utils';
import { MailerModule } from '@nestjs-modules/mailer';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [GlobalConfigService],
      useFactory: (config: GlobalConfigService) => ({
        transport: {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.password,
          },
        },
        defaults: {
          from: config.smtp.from,
        },
      }),
    }),
  ],
  providers: [GlobalConfigService, LoggerService, JwtService, PasswordUtils, EmailService, PushNotificationService],
  exports: [GlobalConfigService, LoggerService, JwtService, PasswordUtils, EmailService, PushNotificationService],
})
export class SharedModule {}

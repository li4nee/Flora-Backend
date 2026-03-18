import { Global, Module } from '@nestjs/common';
import { GlobalConfigService } from './config/global.config';
import { LoggerService } from './config/loggerService.config';
import { JwtService } from './config/jwt.config';
import { PasswordUtils } from './utils/password.utils';
// import { EmailService } from './utils/email.utils';

@Global()
@Module({
  providers: [GlobalConfigService, LoggerService, JwtService, PasswordUtils],
  exports: [GlobalConfigService, LoggerService, JwtService, PasswordUtils],
})
export class SharedModule {}

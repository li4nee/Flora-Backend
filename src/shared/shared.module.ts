import { Global, Module } from '@nestjs/common';
import { GlobalConfigService } from './config/globalService.config';
import { LoggerService } from './config/loggerService.config';
import { JwtService } from './config/jwt.config';

@Global()
@Module({
  providers: [GlobalConfigService, LoggerService, JwtService],
  exports: [GlobalConfigService, LoggerService, JwtService],
})
export class SharedModule {}

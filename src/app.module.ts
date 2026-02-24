import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './shared/config/typeOrm.config';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { AppController } from './app.controller';
@Module({
  imports: [SharedModule, TypeOrmModule.forRootAsync(TypeOrmConfig.getOrmConfig()), AuthModule, UserModule],
  controllers: [AppController],
})
export class AppModule {}

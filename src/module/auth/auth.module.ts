import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { GlobalConfigService } from 'src/shared/config/global.config';
import { JwtStrategy } from './strategies/jwt.strategies';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { RefreshToken } from './entities/refreshToken.entity';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [GlobalConfigService],
      useFactory: (config: GlobalConfigService) => ({
        secret: config.jwt.secret,
        signOptions: {
          // expiresIn: config.jwt.expiresIn as StringValue,
          expiresIn: '7d',
        },
      }),
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

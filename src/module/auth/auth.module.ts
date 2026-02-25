import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { GlobalConfigService } from 'src/shared/config/globalService.config';
import { JwtStrategy } from './strategies/jwt.strategies';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [GlobalConfigService],
      useFactory: (config: GlobalConfigService) => ({
        secret: config.jwt.secret,
        signOptions: {
          expiresIn: parseInt(config.jwt.expiresIn, 10),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { InvalidInputError, PermissionNotGrantedError } from 'src/shared/typings/error.typings';
import { UserService } from '../user/user.service';
import { PasswordUtils } from 'src/shared/utils/password.utils';
import { GlobalConfigService } from 'src/shared/config/global.config';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refreshToken.entity';
import { MoreThan, Repository, UpdateResult } from 'typeorm';
import { StringValue } from 'ms';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from 'src/shared/config/loggerService.config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly passwordUtils: PasswordUtils,
    private readonly config: GlobalConfigService,
    private readonly logger: LoggerService,
  ) {}

  async register(body: AuthRegisterDto): Promise<{ message: string }> {
    const { email, password, profile } = body;

    const existingUser = await this.userService.userExistsByEmail(email);

    if (existingUser) {
      throw new InvalidInputError('Email already registered');
    }

    const hashedPassword = await this.passwordUtils.hashPassword(password);

    await this.userService.create(email, hashedPassword, profile);

    return {
      message: 'User registered successfully. Please login to continue.',
    };
  }

  async login(body: AuthLoginDto) {
    const user = await this.userService.getUserPasswordByEmail(body.email);

    if (!user) {
      throw new InvalidInputError('Invalid credentials');
    }

    const isMatch = await this.passwordUtils.comparePassword(body.password, user.password);

    if (!isMatch) {
      throw new PermissionNotGrantedError('Invalid credentials');
    }

    const accessToken = this.createAccessToken(user.id);

    const refreshToken = this.createRefreshToken(user.id);

    const hashedRefreshToken = await this.passwordUtils.hashPassword(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

    return {
      message: 'Login successful',
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user.id,
        },
      },
    };
  }

  async refreshToken(body: RefreshTokenDto) {
    const { refreshToken } = body;

    const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
      secret: this.config.jwt.refreshTokenSecret,
    });
    const userId = payload.sub;

    const existingTokens = await this.getRefreshToken(userId);
    if (!existingTokens || existingTokens.length === 0) {
      throw new PermissionNotGrantedError('Invalid refresh token');
    }

    const matchedToken = await this.filterAndMatchRefreshToken(refreshToken, existingTokens);
    if (!matchedToken) {
      throw new PermissionNotGrantedError('Invalid refresh token');
    }

    const accessToken = this.createAccessToken(userId);
    const newRefreshToken = this.createRefreshToken(userId);

    await this.invalidateRefreshToken(matchedToken.id, userId);

    const hashedRefreshToken = await this.passwordUtils.hashPassword(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.saveRefreshToken(userId, hashedRefreshToken, expiresAt);
    return {
      message: 'Token refreshed successfully',
      data: {
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  async logout(userId: string, body: RefreshTokenDto) {
    const { refreshToken } = body;
    const existingTokens = await this.getRefreshToken(userId);
    const matchedToken = await this.filterAndMatchRefreshToken(refreshToken, existingTokens);
    if (matchedToken) {
      await this.invalidateRefreshToken(matchedToken.id, userId);
    }
    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepo.update({ userId }, { trash: true });
    return {
      message: 'Logged out from all devices successfully',
    };
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanExpiredRefreshTokens() {
    try {
      const now = new Date();

      const result = await this.refreshTokenRepo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('expiresAt < :now', { now })
        .execute();

      this.logger.info(`Cron: Deleted ${result.affected} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Cron: Error deleting expired refresh tokens', error);
    }
  }

  private async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId,
      user: { id: userId },
      token,
      expiresAt,
    });
    return this.refreshTokenRepo.save(refreshTokenEntity);
  }

  private createToken(userId: string, secret: string, expiresIn: StringValue): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
    });
  }

  private createAccessToken(userId: string): string {
    return this.createToken(userId, this.config.jwt.secret, this.config.jwt.expiresIn as StringValue);
  }

  private createRefreshToken(userId: string): string {
    return this.createToken(userId, this.config.jwt.refreshTokenSecret, this.config.jwt.refreshTokenExpiresIn as StringValue);
  }

  private async getRefreshToken(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepo.find({
      where: {
        expiresAt: MoreThan(new Date()),
        userId,
        trash: false,
      },
      select: ['id', 'userId', 'expiresAt', 'trash', 'token'],
    });
  }

  private async invalidateRefreshToken(tokenId: string, userId: string): Promise<UpdateResult> {
    return this.refreshTokenRepo.update({ id: tokenId, userId }, { trash: true });
  }

  private async filterAndMatchRefreshToken(token: string, refreshTokens: RefreshToken[]): Promise<RefreshToken | null> {
    for (const t of refreshTokens) {
      const isMatch = await this.passwordUtils.comparePassword(token, t.token);

      if (isMatch) {
        return t;
      }
    }
    return null;
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { EmailNotVerifiedError, InvalidInputError, PermissionNotGrantedError, UnauthorizedError } from '../../shared/typings/error.typings';
import { UserService } from '../user/user.service';
import { PasswordUtils } from '../../shared/utils/password.utils';
import { GlobalConfigService } from '../../shared/config/global.config';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refreshToken.entity';
import { EmailToken } from './entities/emailToken.entity';
import { LessThan, MoreThan, Repository, UpdateResult } from 'typeorm';
import { StringValue } from 'ms';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../../shared/config/loggerService.config';
import { EmailService } from '../../shared/utils/email.utils';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,

    @InjectRepository(EmailToken)
    private readonly emailTokenRepo: Repository<EmailToken>,

    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly passwordUtils: PasswordUtils,
    private readonly config: GlobalConfigService,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {}

  async register(body: AuthRegisterDto): Promise<{ message: string }> {
    const { email, password, profile } = body;

    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new InvalidInputError('Email already registered');
      }

      await this.invalidateAllEmailTokens(existingUser.id, 'verify');
      await this.sendVerificationEmail(existingUser.id, email);

      return {
        message: 'Account already exists but is not verified. A new verification code has been sent to your email.',
      };
    }

    const hashedPassword = await this.passwordUtils.hashPassword(password);

    const user = await this.userService.create(email, hashedPassword, profile);

    this.sendVerificationEmail(user.id, email)
      .then(() => {
        this.logger.info(`Verification email sent to ${email} for user ID ${user.id}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send verification email to ${email} for user ID ${user.id}`, error);
      });

    return {
      message: 'User registered successfully. A verification code has been sent to your email.',
    };
  }

  async login(body: AuthLoginDto) {
    const user = await this.userService.getUserPasswordByEmail(body.email);

    if (!user) {
      throw new InvalidInputError('Invalid credentials');
    }

    const isMatch = await this.passwordUtils.comparePassword(body.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    console.log(user);
    const isEmailVerified = user?.isEmailVerified ?? false;

    if (!isEmailVerified) {
      throw new EmailNotVerifiedError('Email not verified. Please verify your email before logging in.');
    }

    const accessToken = this.createAccessToken(user.id);

    const refreshToken = this.createRefreshToken(user.id);

    const hashedRefreshToken = await this.passwordUtils.hashPassword(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.saveRefreshToken(user.id, hashedRefreshToken, expiresAt);

    return {
      message: isEmailVerified ? 'Login successful' : 'Login successful. Please verify your email address.',
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user.id,
          isEmailVerified,
        },
      },
    };
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const otp = await this.createEmailToken(userId, 'verify');

    try {
      await this.emailService.sendOtpEmail(email, otp, 'verify');
    } catch {
      this.logger.warn(`Failed to send verification email to ${email}, OTP: ${otp}`);
    }
  }

  async verifyEmail(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new InvalidInputError('Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const isValid = await this.validateEmailToken(user.id, otp, 'verify');
    if (!isValid) {
      throw new InvalidInputError('Invalid or expired OTP');
    }

    await this.userService.markEmailVerified(user.id);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return { message: 'If an account with this email exists, a verification code has been sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    await this.invalidateAllEmailTokens(user.id, 'verify');

    await this.sendVerificationEmail(user.id, email);

    return { message: 'If an account with this email exists, a verification code has been sent.' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);

    const successMessage = 'If an account with this email exists, a password reset code has been sent.';

    if (!user) {
      return { message: successMessage };
    }

    await this.invalidateAllEmailTokens(user.id, 'reset');

    const otp = await this.createEmailToken(user.id, 'reset');

    try {
      this.emailService
        .sendOtpEmail(email, otp, 'reset')
        .then(() => {
          this.logger.info(`Password reset email sent to ${email} for user ID ${user.id}`);
        })
        .catch((e) => {
          this.logger.error(`Failed to send password reset email to ${email} for user ID ${user.id}`, e);
        });
    } catch {
      this.logger.warn(`Failed to send reset email to ${email}, OTP: ${otp}`);
    }

    return { message: successMessage };
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new InvalidInputError('Invalid email or OTP');
    }

    const isValid = await this.validateEmailToken(user.id, otp, 'reset');
    if (!isValid) {
      throw new InvalidInputError('Invalid or expired OTP');
    }

    const hashedPassword = await this.passwordUtils.hashPassword(newPassword);
    await this.userService.updatePasswordDirect(user.id, hashedPassword);

    await this.refreshTokenRepo.update({ userId: user.id }, { trash: true });

    return { message: 'Password reset successfully. Please login with your new password.' };
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
  async cleanExpiredTokens() {
    try {
      const now = new Date();

      const refreshResult = await this.refreshTokenRepo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('expiresAt < :now', { now })
        .execute();

      const emailResult = await this.emailTokenRepo
        .createQueryBuilder()
        .delete()
        .from(EmailToken)
        .where('expiresAt < :now', { now })
        .execute();

      this.logger.info(
        `Cron: Deleted ${refreshResult.affected} expired refresh tokens, ${emailResult.affected} expired email tokens`,
      );
    } catch (error) {
      this.logger.error('Cron: Error deleting expired tokens', error);
    }
  }

  private generateOtp(): string {
    // 6 DIGIT FROM 100000-999999
    return crypto.randomInt(100000, 999999).toString();
  }

  private async createEmailToken(userId: string, type: 'verify' | 'reset'): Promise<string> {
    const otp = this.generateOtp();
    const hashedOtp = await this.passwordUtils.hashPassword(otp);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const token = this.emailTokenRepo.create({
      token: hashedOtp,
      userId,
      expiresAt,
      type,
      isUsed: false,
    });

    await this.emailTokenRepo.save(token);
    return otp; // return plaintext OTP for sending via email but in db only store hash
  }

  private async validateEmailToken(userId: string, otp: string, type: 'verify' | 'reset'): Promise<boolean> {
    const tokens = await this.emailTokenRepo.find({
      where: {
        userId,
        type,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    for (const token of tokens) {
      const isMatch = await this.passwordUtils.comparePassword(otp, token.token);
      if (isMatch) {
        // Mark token as used
        token.isUsed = true;
        await this.emailTokenRepo.save(token);
        return true;
      }
    }

    return false;
  }

  private async invalidateAllEmailTokens(userId: string, type: 'verify' | 'reset'): Promise<void> {
    await this.emailTokenRepo.update({ userId, type, isUsed: false }, { isUsed: true });
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

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';
import { VerifyEmailDto } from './dto/verifyEmail.dto';
import { ResendVerificationDto } from './dto/resendVerification.dto';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (sends verification email)' })
  @ApiBody({ type: AuthRegisterDto })
  async register(@Body() body: AuthRegisterDto) {
    const result = await this.authService.register(body);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: AuthLoginDto })
  async login(@Body() body: AuthLoginDto) {
    const result = await this.authService.login(body);
    return result;
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with OTP' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return await this.authService.verifyEmail(body.email, body.otp);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email with a new OTP' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() body: ResendVerificationDto) {
    return await this.authService.resendVerificationEmail(body.email);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset OTP via email' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body.email, body.otp, body.newPassword);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() body: RefreshTokenDto) {
    const result = await this.authService.refreshToken(body);
    return result;
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user from single device' })
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUserId() userId: string, @Body() body: RefreshTokenDto) {
    await this.authService.logout(userId, body);
    return {
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user from all devices' })
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUserId() userId: string) {
    await this.authService.logoutAll(userId);
    return {
      message: 'Logged out from all devices successfully',
    };
  }

  @Get('/protected-test-garna')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Access protected resource' })
  @UseGuards(JwtAuthGuard)
  getProtectedResource() {
    return {
      message: 'This is a protected resource',
    };
  }
}

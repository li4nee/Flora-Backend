import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { CurrentUserId } from 'src/shared/decorators/currentUserId.decorators';

/**
 * Todo:
 * - Add email verification and password reset
 * - Rate limit login attempts to prevent brute-force attacks and account lockouts
 * - Blacklisting of access tokens on logout
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
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

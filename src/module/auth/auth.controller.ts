import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

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

  @Get('/protected')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Access protected resource' })
  @UseGuards(JwtAuthGuard)
  getProtectedResource() {
    return {
      message: 'This is a protected resource',
    };
  }
}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { InvalidInputError, PermissionNotGrantedError } from 'src/shared/typings/error.typings';
import { UserService } from '../user/user.service';
import { PasswordUtils } from 'src/shared/utils/password.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly passwordUtils: PasswordUtils,
  ) {}

  async register(body: AuthRegisterDto) {
    const { email, password, profile } = body;

    const existingUser = await this.userService.userExistsByEmail(email);

    if (existingUser) {
      throw new InvalidInputError('Email already registered');
    }

    const hashedPassword = await this.passwordUtils.hashPassword(password);

    const user = await this.userService.create(email, hashedPassword, profile);

    const token = this.jwtService.sign({
      sub: user.id,
    });

    return {
      message: 'User registered successfully',
      data: {
        accessToken: token,
      },
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

    const token = this.jwtService.sign({
      sub: user.id,
    });

    return {
      message: 'Login successful',
      data: {
        accessToken: token,
        user: {
          id: user.id,
        },
      },
    };
  }
}

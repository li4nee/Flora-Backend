import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../user/entities/user.entity';
import { AuthRegisterDto } from './dto/registerUser.dto';
import { AuthLoginDto } from './dto/loginUser.dto';
import { Profile } from '../user/entities/profile.entity';
import { InvalidInputError, PermissionNotGrantedError } from 'src/shared/typings/error.typings';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: AuthRegisterDto) {
    const { email, password, profile } = body;

    const existingUser = await this.userRepo.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new InvalidInputError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User();
    const newProfile = new Profile();
    user.email = email;
    user.password = hashedPassword;
    newProfile.firstName = profile.firstName;
    newProfile.lastName = profile.lastName;
    newProfile.dateOfBirth = profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null;
    user.profile = newProfile;

    await this.userRepo.save(user);

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
    const { email, password } = body;

    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'password'],
    });

    if (!user) {
      throw new InvalidInputError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);

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
          email: user.email,
        },
      },
    };
  }
}

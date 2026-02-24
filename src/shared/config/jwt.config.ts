import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { GlobalConfigService } from './globalService.config';
import { InvalidInputError } from '../typings/error.typings';
import { LoggerService } from './loggerService.config';

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(
    private readonly config: GlobalConfigService,
    private readonly logger: LoggerService,
  ) {
    this.secret = this.config.jwt.secret;
    this.expiresIn = this.config.jwt.expiresIn;
  }

  sign(payload: Record<string, any>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: Number(this.expiresIn),
    });
  }

  verify<T = any>(token: string): T {
    try {
      return jwt.verify(token, this.secret) as T;
    } catch (err) {
      this.logger.error('JWT verification failed', err);
      throw new InvalidInputError('Invalid or expired token');
    }
  }
}

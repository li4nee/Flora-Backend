import { Injectable } from '@nestjs/common';
import { EnvConfig, envSchema } from './envChecking.config';

@Injectable()
export class GlobalConfigService {
  private readonly env: EnvConfig;

  constructor() {
    const parsedEnv = envSchema.safeParse(process.env);

    if (!parsedEnv.success) {
      console.error('Invalid environment variables:');
      process.exit(1); // fail fast
    }

    this.env = parsedEnv.data;
  }

  get app() {
    return {
      port: parseInt(this.env.PORT, 10),
      nodeEnv: this.env.NODE_ENV,
    };
  }

  get database() {
    return {
      host: this.env.POSTGRES_HOST,
      port: parseInt(this.env.POSTGRES_PORT, 10),
      username: this.env.POSTGRES_USER,
      password: this.env.POSTGRES_PASSWORD,
      database: this.env.POSTGRES_DB,
    };
  }

  get jwt() {
    return {
      secret: this.env.JWT_SECRET,
      expiresIn: String(this.env.JWT_EXPIRES_IN),
      refreshTokenExpiresIn: String(this.env.JWT_REFRESH_EXPIRES_IN),
      refreshTokenSecret: this.env.JWT_REFRESH_SECRET,
    };
  }

  get smtp() {
    return {
      host: this.env.SMTP_HOST,
      port: parseInt(this.env.SMTP_PORT, 10),
      user: this.env.SMTP_USER,
      password: this.env.SMTP_PASSWORD,
      from: this.env.SMTP_FROM,
    };
  }

  get firebase() {
    return {
      projectId: this.env.FIREBASE_PROJECT_ID,
      clientEmail: this.env.FIREBASE_CLIENT_EMAIL,
      // .env files can't hold real newlines, so the key is stored with `\n` escaped.
      privateKey: this.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
}

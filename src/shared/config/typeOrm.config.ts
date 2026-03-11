import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { GlobalConfigService } from './global.config';
import { LoggerService } from './loggerService.config';

@Injectable()
export class TypeOrmConfig {
  static getOrmConfig(): TypeOrmModuleAsyncOptions {
    return {
      useFactory: (config: GlobalConfigService, logger: LoggerService) => {
        const db = config.database;

        logger.info(`Connecting to database ${db.database} at ${db.host}:${db.port}`);

        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          synchronize: config.app.nodeEnv !== 'production',
          logging: config.app.nodeEnv !== 'production',
          autoLoadEntities: true,
        };
      },
      inject: [GlobalConfigService, LoggerService],
    };
  }
}

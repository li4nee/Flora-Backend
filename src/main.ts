import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalConfigService } from './shared/config/globalService.config';
import { LoggerService } from './shared/config/loggerService.config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './shared/filters/globalException.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(GlobalConfigService);
  const logger = app.get(LoggerService);

  app.use(helmet());
  // app.use(cookieParser());

  app.enableCors({
    origin: ['*'],
    credentials: true, // allow cookies
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove extra properties
      transform: true, // auto-transform payloads to DTO instances
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.setGlobalPrefix('/api/v1');
  if (config.app.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Flora API')
      .setDescription('Flora API docs')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('/docs', app, document);
    logger.info('Swagger docs available at /docs');
  }
  app.enableShutdownHooks();
  await app.listen(config.app.port);
}

bootstrap()
  .then(() => {
    console.log('Application started successfully');
    console.log(`Listening on port ${process.env.PORT || 4000}`);
  })
  .catch((err) => {
    console.error('Failed to start application', err);
    process.exit(1);
  });

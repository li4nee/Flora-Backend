import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalConfigService } from './shared/config/global.config';
import { LoggerService } from './shared/config/loggerService.config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './shared/filters/globalException.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseInterceptor } from './shared/interceptor/response.interceptor';
import type { Request, Response } from 'express';
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

  app.setGlobalPrefix('/api/v1');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flora API')
    .setDescription('Flora API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/docs', app, document);
  logger.info('Swagger docs available at /docs');

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(new ResponseInterceptor());
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

// Things left to do in here :
// Add Rate limiting
// Add graceful shutdown hooks for cleanup on app termination
// Add CORS configuration
// Add endpoints for health checks and metrics

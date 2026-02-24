import { Controller, All, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ResourceNotFoundError } from './shared/typings/error.typings';

@Controller('api/v1')
export class AppController {
  @All('*path')
  handleUnknownRoutes(@Req() req: Request) {
    throw new ResourceNotFoundError(`Route ${req.method} ${req.url} not found`);
  }
}

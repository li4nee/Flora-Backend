import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiResponse } from '../typings/base.typings';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map(
        (data: T) =>
          ({
            success: true,
            statusCode: response.statusCode,
            message: (data as Record<string, unknown>)?.message || 'Success',
            data: (data as Record<string, unknown>)?.data ?? data,
            timestamp: new Date().toISOString(),
            path: request.url,
          }) as ApiResponse<T>,
      ),
    );
  }
}

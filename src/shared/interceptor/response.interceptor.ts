import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  status: number;
  timestamp: string;
  path: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseFormat<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat<T>> {
    const request: { url: string } = context.switchToHttp().getRequest<{ url: string }>();
    const response: { statusCode: number } = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: T) => ({
        status: response.statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        data: data,
      })),
    );
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../config/loggerService.config';
import { CustomError, ErrorHttpStatusCode, ErrorMessage } from '../typings/error.typings';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof CustomError) {
      status = exception.getStatus();
      message = exception.message;
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
        errorCode = this.findTheErrorMessageForUnknownException(exception);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    this.logger.error(`[${request.method}] ${request.url} - ${message}`, {
      stack: exception instanceof Error ? exception.stack : undefined,
    });
    response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private findTheErrorMessageForUnknownException(exception: unknown): string {
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const statusCodeToErrorMessage: Record<number, ErrorMessage> = {
      [ErrorHttpStatusCode.INVALID_INPUT]: ErrorMessage.INVALID_INPUT,
      [ErrorHttpStatusCode.PERMISSION_NOT_GRANTED]: ErrorMessage.PERMISSION_NOT_GRANTED,
      [ErrorHttpStatusCode.RESOURCE_NOT_FOUND]: ErrorMessage.RESOURCE_NOT_FOUND,
      [ErrorHttpStatusCode.INTERNAL_SERVER_ERROR]: ErrorMessage.INTERNAL_SERVER_ERROR,
      [ErrorHttpStatusCode.RATE_LIMIT_EXCEEDED]: ErrorMessage.RATE_LIMIT_EXCEEDED,
      [ErrorHttpStatusCode.UNAUTHORIZED]: ErrorMessage.UNAUTHORIZED,
    };

    return statusCodeToErrorMessage[statusCode] || ErrorMessage.INTERNAL_SERVER_ERROR;
  }
}

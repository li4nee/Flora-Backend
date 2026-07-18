import { HttpException } from '@nestjs/common';

export enum ErrorMessage {
  INVALID_INPUT = 'INVALID_INPUT',
  PERMISSION_NOT_GRANTED = 'PERMISSION_NOT_GRANTED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
}

export enum ErrorHttpStatusCode {
  INVALID_INPUT = 400,
  PERMISSION_NOT_GRANTED = 403,
  RESOURCE_NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  RATE_LIMIT_EXCEEDED = 429,
  UNAUTHORIZED = 401,
}

export abstract class CustomError extends HttpException {
  public readonly errorCode: ErrorMessage;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode: ErrorMessage) {
    super({ message, errorCode }, statusCode);
    this.errorCode = errorCode;
    this.isOperational = true;
  }
}

export class InvalidInputError extends CustomError {
  constructor(message = 'Invalid input') {
    super(message, ErrorHttpStatusCode.INVALID_INPUT, ErrorMessage.INVALID_INPUT);
  }
}

export class EmailNotVerifiedError extends CustomError {
  constructor(message = 'Email not verified') {
    super(message, ErrorHttpStatusCode.UNAUTHORIZED, ErrorMessage.EMAIL_NOT_VERIFIED);
  }
}

export class PermissionNotGrantedError extends CustomError {
  constructor(message = 'Permission not granted') {
    super(message, ErrorHttpStatusCode.PERMISSION_NOT_GRANTED, ErrorMessage.PERMISSION_NOT_GRANTED);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized') {
    super(message, ErrorHttpStatusCode.UNAUTHORIZED, ErrorMessage.UNAUTHORIZED);
  }
}

export class ResourceNotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, ErrorHttpStatusCode.RESOURCE_NOT_FOUND, ErrorMessage.RESOURCE_NOT_FOUND);
  }
}

export class RateLimitExceededError extends CustomError {
  constructor(message = 'Rate limit exceeded') {
    super(message, ErrorHttpStatusCode.RATE_LIMIT_EXCEEDED, ErrorMessage.RATE_LIMIT_EXCEEDED);
  }
}

export class InternalServerError extends CustomError {
  constructor(message = 'Internal server error') {
    super(message, ErrorHttpStatusCode.INTERNAL_SERVER_ERROR, ErrorMessage.INTERNAL_SERVER_ERROR);
  }
}

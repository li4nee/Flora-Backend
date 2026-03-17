import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UnauthorizedError } from '../typings/error.typings';
import { AuthorizedRequest } from '../typings/auth.typings';

/**
 * Extracts userId from the JWT-guarded request
 */
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthorizedRequest>();
  const userId = request.user?.userId;
  if (!userId) {
    throw new UnauthorizedError('User ID not found in request');
  }
  return userId;
});

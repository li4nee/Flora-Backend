import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PermissionNotGrantedError } from '../typings/error.typings';
import { AuthorizedRequest } from '../typings/auth.typings';

/**
 * Extracts userId from the JWT-guarded request
 */
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthorizedRequest>();
  const userId = request.user?.userId;

  console.log('Extracted userId from request:', userId); // Debug log to verify extraction
  if (!userId) {
    throw new PermissionNotGrantedError('User ID not found in request'); // You can throw your custom PermissionNotGrantedError
  }

  return userId;
});

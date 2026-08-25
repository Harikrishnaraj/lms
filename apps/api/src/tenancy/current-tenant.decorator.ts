import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

/** The caller's organizationId, as resolved by TenantContextInterceptor. */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const organizationId = request.user?.organizationId;
  if (typeof organizationId !== 'string' || organizationId.length === 0) {
    // TenantContextInterceptor should already have rejected this request;
    // this is a defensive backstop, not the primary enforcement point.
    throw new ForbiddenException('Request is missing organization context');
  }
  return organizationId;
});

import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { TenantContextStorage } from './tenant-context.storage';

/**
 * Resolves the caller's organization from the already-verified JWT (attached
 * to the request by JwtAuthGuard, which always runs first in Nest's request
 * lifecycle) and runs the rest of the request inside TenantContextStorage.
 * Applied globally (see TenancyModule) so no controller can forget it.
 *
 * A route only skips this if explicitly marked @Public() — every
 * authenticated route requires a resolvable organization, full stop.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContextStorage: TenantContextStorage,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const organizationId: unknown = request.user?.organizationId;

    if (typeof organizationId !== 'string' || organizationId.length === 0) {
      throw new ForbiddenException('Request is missing organization context');
    }

    return new Observable((subscriber) => {
      this.tenantContextStorage.run({ organizationId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}

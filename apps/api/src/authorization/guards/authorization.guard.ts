import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleKey } from '@lms/database';
import { PERMISSIONS_KEY, ROLES_KEY } from '../authorization.constants';
import { AuthorizationService } from '../authorization.service';

/**
 * Applied globally (see AuthorizationModule) alongside JwtAuthGuard. A route
 * with no @Roles()/@Permissions() metadata is unrestricted beyond
 * authentication + tenant context — this guard only ever adds restrictions,
 * never grants access on its own.
 *
 * Must run after JwtAuthGuard (see AppModule import order: AuthModule before
 * AuthorizationModule — Nest applies multiple global guards in module
 * registration order), since it depends on request.user being populated.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RoleKey[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organizationId: unknown = request.user?.organizationId;
    const userId: unknown = request.user?.id;

    if (typeof organizationId !== 'string' || typeof userId !== 'string') {
      throw new ForbiddenException('Request is missing organization context');
    }

    const resolved = await this.authorizationService.resolve(organizationId, userId);
    if (!resolved) {
      throw new ForbiddenException('You do not have a role in this organization');
    }

    if (requiredRoles?.length && !requiredRoles.includes(resolved.role)) {
      throw new ForbiddenException('Your role does not permit this action');
    }

    if (requiredPermissions?.length) {
      const missing = requiredPermissions.filter((permission) => !resolved.permissions.includes(permission));
      if (missing.length > 0) {
        throw new ForbiddenException(`Missing required permission(s): ${missing.join(', ')}`);
      }
    }

    return true;
  }
}

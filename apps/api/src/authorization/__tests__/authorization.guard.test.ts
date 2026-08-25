import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleKey } from '@lms/database';
import { AuthorizationGuard } from '../guards/authorization.guard';
import { AuthorizationService } from '../authorization.service';

function fakeContext(user: { id: string; organizationId: string } | undefined): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
  } as unknown as ExecutionContext;
}

describe('AuthorizationGuard', () => {
  let authorizationService: AuthorizationService;
  let reflector: Reflector;

  beforeEach(() => {
    authorizationService = { resolve: vi.fn() } as unknown as AuthorizationService;
  });

  function guardWith(roles: RoleKey[] | undefined, permissions: string[] | undefined): AuthorizationGuard {
    reflector = {
      getAllAndOverride: vi.fn((key: string) => {
        if (key === 'authorization:roles') return roles;
        if (key === 'authorization:permissions') return permissions;
        return undefined;
      }),
    } as unknown as Reflector;
    return new AuthorizationGuard(reflector, authorizationService);
  }

  it('passes through when no @Roles()/@Permissions() metadata is present', async () => {
    const guard = guardWith(undefined, undefined);
    const context = fakeContext({ id: 'auth0|1', organizationId: 'org-a' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authorizationService.resolve).not.toHaveBeenCalled();
  });

  describe('role checks', () => {
    it('ALLOWED ROLE: grants access when the caller holds one of the required roles', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: RoleKey.ORGANIZATION_ADMIN,
        permissions: [],
      });
      const guard = guardWith([RoleKey.HR_LD_ADMIN, RoleKey.ORGANIZATION_ADMIN], undefined);
      const context = fakeContext({ id: 'auth0|admin', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('DENIED ROLE: rejects with 403 when the caller holds a role outside the required set', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: RoleKey.LEARNER,
        permissions: ['course:read'],
      });
      const guard = guardWith([RoleKey.HR_LD_ADMIN, RoleKey.ORGANIZATION_ADMIN], undefined);
      const context = fakeContext({ id: 'auth0|learner', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('DENIED ROLE: rejects with 403 when the caller has no membership at all', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const guard = guardWith([RoleKey.ORGANIZATION_ADMIN], undefined);
      const context = fakeContext({ id: 'auth0|nobody', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('permission checks', () => {
    it('grants access when the caller holds every required permission', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: RoleKey.HR_LD_ADMIN,
        permissions: ['user:view', 'user:manage'],
      });
      const guard = guardWith(undefined, ['user:manage']);
      const context = fakeContext({ id: 'auth0|hr', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('MISSING PERMISSION: rejects with 403 when a required permission is absent', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: RoleKey.TRAINER,
        permissions: ['course:create', 'course:read'],
      });
      const guard = guardWith(undefined, ['user:manage']);
      const context = fakeContext({ id: 'auth0|trainer', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('MISSING PERMISSION: rejects when only some of several required permissions are held', async () => {
      (authorizationService.resolve as ReturnType<typeof vi.fn>).mockResolvedValue({
        role: RoleKey.MANAGER,
        permissions: ['report:view'],
      });
      const guard = guardWith(undefined, ['report:view', 'report:export']);
      const context = fakeContext({ id: 'auth0|manager', organizationId: 'org-a' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  it('rejects when the request has no resolvable organization context', async () => {
    const guard = guardWith([RoleKey.ORGANIZATION_ADMIN], undefined);
    const context = fakeContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(authorizationService.resolve).not.toHaveBeenCalled();
  });
});

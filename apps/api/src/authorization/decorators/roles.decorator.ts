import { SetMetadata } from '@nestjs/common';
import type { RoleKey } from '@lms/database';
import { ROLES_KEY } from '../authorization.constants';

/** Restricts a route to callers whose role (within their own org) is one of `roles`. */
export const Roles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);

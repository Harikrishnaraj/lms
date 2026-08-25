import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../authorization.constants';

/** Restricts a route to callers holding every listed permission key (AND semantics). */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

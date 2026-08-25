import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantContext {
  organizationId: string;
}

/**
 * Ambient, request-scoped tenant identity, readable from anywhere in the call
 * stack without threading organizationId through every function signature —
 * this is what lets a repository or query-builder buried several layers below
 * a controller still enforce tenant scoping. Populated once per request by
 * TenantContextInterceptor; never populated from anything but the verified
 * JWT (see TRD 9.2, "Data Isolation Violation Rule": organization_id is never
 * accepted from query params or request bodies).
 */
@Injectable()
export class TenantContextStorage {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getOrganizationId(): string {
    const context = this.storage.getStore();
    if (!context) {
      throw new Error(
        'Tenant context was accessed outside of a request scope. ' +
          'Every tenant-owned query must run inside TenantContextInterceptor.',
      );
    }
    return context.organizationId;
  }
}

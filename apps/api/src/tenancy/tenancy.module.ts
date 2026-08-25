import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantContextStorage } from './tenant-context.storage';

@Global()
@Module({
  providers: [
    TenantContextStorage,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [TenantContextStorage],
})
export class TenancyModule {}

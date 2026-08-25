import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthorizationGuard } from './guards/authorization.guard';
import { AuthorizationService } from './authorization.service';

@Global()
@Module({
  providers: [
    AuthorizationService,
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}

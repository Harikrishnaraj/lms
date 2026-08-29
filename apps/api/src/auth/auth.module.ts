import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevAuthController } from './dev/dev-auth.controller';
import { DevAuthService } from './dev/dev-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IDENTITY_PROVIDER } from './ports/identity-provider.port';
import { SESSION_STORE } from './ports/session-store.port';
import { Auth0IdentityProvider } from './providers/auth0-identity-provider';
import { RedisSessionStore } from './providers/redis-session-store';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController, DevAuthController],
  providers: [
    AuthService,
    DevAuthService,
    JwtStrategy,
    { provide: IDENTITY_PROVIDER, useClass: Auth0IdentityProvider },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}

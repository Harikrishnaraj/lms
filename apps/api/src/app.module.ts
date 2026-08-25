import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '@lms/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RedisModule } from './redis/redis.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    RedisModule,
    // Global guard/interceptor order matters here: AuthModule (JwtAuthGuard)
    // must run before AuthorizationModule (AuthorizationGuard), since the
    // latter depends on request.user already being populated. Nest applies
    // multiple APP_GUARD providers in module registration order.
    AuthModule,
    AuthorizationModule,
    TenancyModule,
    OrganizationsModule,
    MembershipsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '@lms/config';
import { AppController } from './app.controller';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { ContentItemsModule } from './content-items/content-items.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { CoursesModule } from './courses/courses.module';
import { DatabaseModule } from './database/database.module';
import { DepartmentsModule } from './departments/departments.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LearningPathsModule } from './learning-paths/learning-paths.module';
import { PlayerModule } from './player/player.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RedisModule } from './redis/redis.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { UsersModule } from './users/users.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';

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
    UsersModule,
    DepartmentsModule,
    CoursesModule,
    CourseModulesModule,
    ContentItemsModule,
    EnrollmentsModule,
    PlayerModule,
    LearningPathsModule,
    AssignmentsModule,
    AssessmentsModule,
    CertificatesModule,
    SearchModule,
    AnalyticsModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

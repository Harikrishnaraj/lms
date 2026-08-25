import { Module, Controller, Get } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaService } from './prisma.service'
import { DashboardController } from './dashboard/dashboard.controller'
import { CoursesController } from './courses/courses.controller'
import { AssessmentsController } from './assessments/assessments.controller'
import { DiscussionsController } from './discussions/discussions.controller'
import { AITutorController } from './ai-tutor/ai-tutor.controller'
import { NotificationsController } from './notifications/notifications.controller'
import { CalendarController } from './calendar/calendar.controller'
import { CertificatesController } from './certificates/certificates.controller'
import { AuthModule } from './auth/auth.module'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'OK', timestamp: new Date().toISOString() }
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [
    HealthController,
    DashboardController,
    CoursesController,
    AssessmentsController,
    DiscussionsController,
    AITutorController,
    NotificationsController,
    CalendarController,
    CertificatesController,
  ],
  providers: [PrismaService],
})
export class AppModule {}

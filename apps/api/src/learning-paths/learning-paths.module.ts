import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { UsersModule } from '../users/users.module';
import { LearningPathCatalogController } from './learning-path-catalog.controller';
import { LearningPathsController } from './learning-paths.controller';
import { LearningPathsService } from './learning-paths.service';

@Module({
  imports: [EnrollmentsModule, UsersModule],
  controllers: [LearningPathsController, LearningPathCatalogController],
  providers: [LearningPathsService],
  exports: [LearningPathsService],
})
export class LearningPathsModule {}

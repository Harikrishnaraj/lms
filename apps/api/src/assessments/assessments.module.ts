import { Module } from '@nestjs/common';
import { PlayerModule } from '../player/player.module';
import { UsersModule } from '../users/users.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { LearnerAssessmentsController } from './learner-assessments.controller';

@Module({
  imports: [PlayerModule, UsersModule],
  controllers: [AssessmentsController, LearnerAssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}

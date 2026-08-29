import { ApiProperty } from '@nestjs/swagger';
import { LearningPathStatus } from '@lms/database';
import { IsEnum } from 'class-validator';

export class SetLearningPathStatusDto {
  @ApiProperty({ enum: LearningPathStatus })
  @IsEnum(LearningPathStatus)
  status!: LearningPathStatus;
}

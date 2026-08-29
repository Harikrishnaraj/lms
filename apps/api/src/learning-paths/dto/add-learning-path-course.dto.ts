import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AddLearningPathCourseDto {
  @ApiProperty()
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional({ default: true, description: 'Required courses gate the path\'s completion rollup; optional courses do not.' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

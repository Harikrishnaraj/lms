import { ApiProperty } from '@nestjs/swagger';
import { CourseStatus } from '@lms/database';
import { IsEnum } from 'class-validator';

export class SetCourseStatusDto {
  @ApiProperty({ enum: CourseStatus })
  @IsEnum(CourseStatus)
  status!: CourseStatus;
}

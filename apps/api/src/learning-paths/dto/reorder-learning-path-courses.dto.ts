import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** courseIds in the desired display order (0-based position is assigned by array index). */
export class ReorderLearningPathCoursesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  courseIds!: string[];
}

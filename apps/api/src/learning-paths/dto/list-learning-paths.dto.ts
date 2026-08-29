import { ApiPropertyOptional } from '@nestjs/swagger';
import { LearningPathStatus } from '@lms/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListLearningPathsQueryDto {
  @ApiPropertyOptional({ description: 'Free-text match on title (case-insensitive).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LearningPathStatus })
  @IsOptional()
  @IsEnum(LearningPathStatus)
  status?: LearningPathStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

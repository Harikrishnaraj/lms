import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '@lms/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Learner-facing catalog filters (Task 13). Deliberately narrower than
 * ListCoursesQueryDto (no `status`/`visibility`/`instructorId` — the
 * catalog is hardcoded to PUBLIC + PUBLISHED, see CoursesService.listCatalog)
 * and adds duration bounds, which the admin course list doesn't need.
 *
 * "Skill filtering" from the Task 13 brief is served by `category` — this
 * schema has no separate skills taxonomy yet (Category already plays that
 * role for filtering), so a second, empty domain model isn't invented here.
 */
export class ListCatalogQueryDto {
  @ApiPropertyOptional({ description: 'Free-text match on title (case-insensitive).' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category (a.k.a. skill tag) name.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDurationMinutes?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDurationMinutes?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 24, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

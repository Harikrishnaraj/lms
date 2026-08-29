import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ListSearchQueryDto {
  @ApiPropertyOptional({ description: 'Search term keyword' })
  @IsString()
  @MinLength(2, { message: 'Search term must be at least 2 characters long' })
  q!: string;

  @ApiPropertyOptional({ description: 'Filter by entity type (courses, paths, users)' })
  @IsOptional()
  @IsString()
  type?: string;
}

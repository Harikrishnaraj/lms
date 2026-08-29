import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AnalyticsCourseQueryDto {
  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by date range (e.g. 30d, 90d, 1y)' })
  @IsOptional()
  @IsString()
  timeframe?: string;
}

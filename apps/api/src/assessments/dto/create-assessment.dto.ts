import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ default: 70, minimum: 0, maximum: 100, description: 'Percentage of total points required to pass.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'Maximum submissions per learner. Omit for unlimited retries.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptLimit?: number;

  @ApiPropertyOptional({ description: 'QUIZ content item this assessment backs. Passing it completes that item for the learner.' })
  @IsOptional()
  @IsUUID()
  contentItemId?: string;
}

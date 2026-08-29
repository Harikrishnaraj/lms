import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateOutlineDto {
  @ApiProperty({ description: 'Topic for course outline generation' })
  @IsString()
  @MinLength(3, { message: 'Topic must be at least 3 characters' })
  @MaxLength(200, { message: 'Topic cannot exceed 200 characters' })
  topic!: string;

  @ApiPropertyOptional({ description: 'Target learner audience' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetAudience?: string;
}

export class TagContentDto {
  @ApiProperty({ description: 'Raw textual content to generate tags for' })
  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters' })
  @MaxLength(20000, { message: 'Content cannot exceed 20,000 characters' })
  content!: string;
}

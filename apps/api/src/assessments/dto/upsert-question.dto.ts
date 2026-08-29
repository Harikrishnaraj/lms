import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Multiple-choice only (Task 18's stated question type). `correctIndex` is
 * an index into `options` and is validated against its length in the
 * service, since class-validator can't cross-reference sibling fields.
 */
export class UpsertQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiProperty({ type: [String], minItems: 2, maxItems: 10 })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options!: string[];

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  correctIndex!: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

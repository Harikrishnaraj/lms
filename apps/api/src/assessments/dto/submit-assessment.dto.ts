import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class SubmittedAnswerDto {
  @ApiProperty()
  @IsUUID()
  questionId!: string;

  @ApiProperty({ minimum: 0, description: 'Index into that question\'s options array.' })
  @IsInt()
  @Min(0)
  selectedIndex!: number;
}

export class SubmitAssessmentDto {
  @ApiProperty({ type: [SubmittedAnswerDto], description: 'One entry per question. Missing or duplicated questions are rejected.' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];
}

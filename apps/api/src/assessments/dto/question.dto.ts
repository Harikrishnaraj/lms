import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class QuestionDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

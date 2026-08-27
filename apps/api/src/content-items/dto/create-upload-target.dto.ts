import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateUploadTargetDto {
  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @MinLength(1)
  contentType!: string;
}

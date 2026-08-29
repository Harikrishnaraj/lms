import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelfEnrollDto {
  @ApiProperty({ description: 'A PUBLIC, PUBLISHED course within the caller\'s organization.' })
  @IsUUID()
  courseId!: string;
}

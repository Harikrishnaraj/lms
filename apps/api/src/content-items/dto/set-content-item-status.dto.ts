import { ApiProperty } from '@nestjs/swagger';
import { ContentItemStatus } from '@lms/database';
import { IsEnum } from 'class-validator';

export class SetContentItemStatusDto {
  @ApiProperty({ enum: ContentItemStatus })
  @IsEnum(ContentItemStatus)
  status!: ContentItemStatus;
}

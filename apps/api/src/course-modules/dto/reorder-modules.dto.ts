import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderModulesDto {
  @ApiProperty({ type: [String], description: 'Every module id for the course, in the desired order.' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  moduleIds!: string[];
}

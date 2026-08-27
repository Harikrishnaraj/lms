import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderContentItemsDto {
  @ApiProperty({ type: [String], description: 'Every content item id for the module, in the desired order.' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  contentItemIds!: string[];
}

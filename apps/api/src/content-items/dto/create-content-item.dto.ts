import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@lms/database';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

const STORAGE_BACKED_TYPES: ContentType[] = [ContentType.VIDEO, ContentType.DOCUMENT, ContentType.RESOURCE];

export class CreateContentItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  type!: ContentType;

  @ApiPropertyOptional({ description: 'Required for VIDEO/DOCUMENT/RESOURCE — the object-storage key from an upload target.' })
  @ValidateIf((dto: CreateContentItemDto) => STORAGE_BACKED_TYPES.includes(dto.type))
  @IsString()
  @MinLength(1)
  storageKey?: string;

  @ApiPropertyOptional({ description: 'Required for TEXT — the inline body content.' })
  @ValidateIf((dto: CreateContentItemDto) => dto.type === ContentType.TEXT)
  @IsString()
  @MinLength(1)
  @MaxLength(50_000)
  textBody?: string;
}

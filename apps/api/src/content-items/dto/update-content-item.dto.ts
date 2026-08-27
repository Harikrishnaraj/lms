import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateContentItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Replace the storage key (VIDEO/DOCUMENT/RESOURCE).' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  storageKey?: string;

  @ApiPropertyOptional({ description: 'Replace the inline body (TEXT).' })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  textBody?: string;
}

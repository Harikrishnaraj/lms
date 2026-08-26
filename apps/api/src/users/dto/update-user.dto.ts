import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleKey } from '@lms/database';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Editable profile fields. `departmentId` is nullable — passing `null`
 * explicitly clears the assignment; omitting it leaves it as-is. Same for
 * `jobTitle`. Email and status are updated through dedicated endpoints so
 * intent is unambiguous.
 */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  jobTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Assign, change, or (with `null`) remove the user\'s role.' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(RoleKey)
  role?: RoleKey | null;
}

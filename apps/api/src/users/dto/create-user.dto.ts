import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleKey } from '@lms/database';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Same shape covers both "create with a known Auth0 subject" and "invite by
 * email". If `externalId` is present the resulting user is ACTIVE; if
 * omitted, the user is INVITED and gets an externalId when the invited
 * person logs in via Auth0 for the first time (auto-provisioning is a
 * later phase).
 */
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department UUID within the caller\'s organization.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Optional initial role. Creates a Membership if provided.' })
  @IsOptional()
  @IsEnum(RoleKey)
  role?: RoleKey;

  @ApiPropertyOptional({
    description: 'Auth0 `sub` claim. Omit to create the user as INVITED (populated on first login).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalId?: string;
}

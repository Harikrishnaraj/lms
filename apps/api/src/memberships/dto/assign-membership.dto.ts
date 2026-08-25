import { ApiProperty } from '@nestjs/swagger';
import { RoleKey } from '@lms/database';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class AssignMembershipDto {
  @ApiProperty({ description: "The identity provider's subject (JWT `sub`) for the target user" })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({ enum: RoleKey })
  @IsEnum(RoleKey)
  role!: RoleKey;
}

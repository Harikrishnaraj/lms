import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@lms/database';
import { IsEnum } from 'class-validator';

export class SetUserStatusDto {
  @ApiProperty({ enum: [UserStatus.ACTIVE, UserStatus.INACTIVE] })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

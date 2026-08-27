import { ApiProperty } from '@nestjs/swagger';
import { DepartmentStatus } from '@lms/database';
import { IsEnum } from 'class-validator';

export class SetDepartmentStatusDto {
  @ApiProperty({ enum: DepartmentStatus })
  @IsEnum(DepartmentStatus)
  status!: DepartmentStatus;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, IsUUID } from 'class-validator';

/**
 * Shared by admin assignment (HR/L&D, Organization Admin — any user, any
 * published course) and manager assignment (restricted at the service layer
 * to users in departments the caller manages — see EnrollmentsService).
 */
export class AssignEnrollmentDto {
  @ApiProperty({ description: "A user id within the caller's organization." })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'A PUBLISHED course within the caller\'s organization.' })
  @IsUUID()
  courseId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'ISO-8601 due date.' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

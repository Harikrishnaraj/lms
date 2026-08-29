import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentScopeType, AssignmentTargetType } from '@lms/database';
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ enum: AssignmentTargetType })
  @IsEnum(AssignmentTargetType)
  targetType!: AssignmentTargetType;

  @ApiPropertyOptional({ description: 'Required when targetType is COURSE.' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Required when targetType is LEARNING_PATH.' })
  @IsOptional()
  @IsUUID()
  learningPathId?: string;

  @ApiProperty({ enum: AssignmentScopeType })
  @IsEnum(AssignmentScopeType)
  scopeType!: AssignmentScopeType;

  @ApiPropertyOptional({ description: 'Required when scopeType is USER.' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Required when scopeType is DEPARTMENT. "Team" has no separate model in this phase -- see assignments/README.md.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

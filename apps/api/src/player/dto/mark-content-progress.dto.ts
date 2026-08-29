import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const MARKABLE_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const;
export type MarkableContentProgressStatus = (typeof MARKABLE_STATUSES)[number];

/**
 * A learner can only ever move progress forward through the player — to
 * IN_PROGRESS (opening a content item) or COMPLETED (finishing it).
 * NOT_STARTED is the implicit default for anything with no ContentProgress
 * row yet and is never a valid target here.
 */
export class MarkContentProgressDto {
  @ApiProperty({ enum: MARKABLE_STATUSES })
  @IsIn(MARKABLE_STATUSES)
  status!: MarkableContentProgressStatus;
}

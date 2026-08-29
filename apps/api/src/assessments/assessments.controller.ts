import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Question } from '@lms/database';
import { Permissions } from '../authorization/decorators/permissions.decorator';
import { CurrentTenant } from '../tenancy/current-tenant.decorator';
import {
  AssessmentForAuthor,
  AssessmentsService,
  AttemptWithLearner,
  PaginatedAssessments,
} from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListAssessmentsQueryDto } from './dto/list-assessments.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { UpsertQuestionDto } from './dto/upsert-question.dto';

/**
 * Assessment authoring (Task 18). Gated on `course:update` — the same
 * permission that already guards editing the course an assessment hangs
 * off, held by Trainer, HR/L&D Admin, and Organization Admin. Everything
 * reachable here may legitimately expose `correctIndex`; the learner-facing
 * surface lives in learner-assessments.controller.ts and never does.
 */
@ApiTags('Assessments')
@Controller('organizations/me/assessments')
@Permissions('course:update')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List assessments in this organization' })
  list(
    @CurrentTenant() organizationId: string,
    @Query() query: ListAssessmentsQueryDto,
  ): Promise<PaginatedAssessments> {
    return this.assessmentsService.list(organizationId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an assessment, optionally attached to a QUIZ content item' })
  create(@CurrentTenant() organizationId: string, @Body() dto: CreateAssessmentDto): Promise<AssessmentForAuthor> {
    return this.assessmentsService.create(organizationId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve an assessment with its questions and answer key (authors only)' })
  getById(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssessmentForAuthor> {
    return this.assessmentsService.getForAuthor(organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment' })
  update(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ): Promise<AssessmentForAuthor> {
    return this.assessmentsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an assessment that has no learner attempts yet' })
  remove(@CurrentTenant() organizationId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.assessmentsService.remove(organizationId, id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a multiple-choice question' })
  addQuestion(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertQuestionDto,
  ): Promise<Question> {
    return this.assessmentsService.addQuestion(organizationId, id, dto);
  }

  @Patch(':id/questions/:questionId')
  @ApiOperation({ summary: 'Replace a question’s text, options, answer key, and points' })
  updateQuestion(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpsertQuestionDto,
  ): Promise<Question> {
    return this.assessmentsService.updateQuestion(organizationId, id, questionId, dto);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a question' })
  removeQuestion(
    @CurrentTenant() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<void> {
    return this.assessmentsService.removeQuestion(organizationId, id, questionId);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'List every learner submission for this assessment (trainer “Submissions” view)' })
  listAttempts(@CurrentTenant() organizationId: string, @Param('id', ParseUUIDPipe) id: string): Promise<AttemptWithLearner[]> {
    return this.assessmentsService.listAttempts(organizationId, id);
  }
}

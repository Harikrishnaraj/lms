import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Assessment, AssessmentAttempt, Prisma, PrismaClient, Question } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { PlayerService } from '../player/player.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListAssessmentsQueryDto } from './dto/list-assessments.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { UpsertQuestionDto } from './dto/upsert-question.dto';

const DEFAULT_PAGE_SIZE = 25;

/** A question as the *learner* is allowed to see it: no `correctIndex`. */
export interface LearnerQuestion {
  id: string;
  text: string;
  options: string[];
  points: number;
}

export interface AssessmentSummary extends Assessment {
  questionCount: number;
  attemptCount: number;
  courseRef: { id: string; title: string } | null;
}

export interface AssessmentForAuthor extends Assessment {
  questions: Question[];
  courseRef: { id: string; title: string } | null;
}

export interface AttemptResult {
  id: string;
  score: number;
  passed: boolean;
  submittedAt: Date;
}

export interface AttemptWithLearner extends AssessmentAttempt {
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface MyAttemptSummary extends AssessmentAttempt {
  assessment: {
    id: string;
    title: string;
    passingScore: number;
    contentItem: { module: { course: { id: string; title: string } } } | null;
  };
}

export interface AssessmentForLearner {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  attemptLimit: number | null;
  attemptsUsed: number;
  /** null when `attemptLimit` is null (unlimited). */
  attemptsRemaining: number | null;
  canAttempt: boolean;
  totalPoints: number;
  questions: LearnerQuestion[];
  lastAttempt: AttemptResult | null;
  bestAttempt: AttemptResult | null;
}

export interface PaginatedAssessments {
  items: AssessmentSummary[];
  page: number;
  pageSize: number;
  total: number;
}

type StoredAnswer = { questionId: string; selectedIndex: number };

/**
 * Tasks 18 + 19. The security-relevant invariant of this whole file: a
 * question's `correctIndex` never crosses the wire to a learner before
 * their submission is graded. Learner-facing reads go through
 * `getForLearner` / `toLearnerQuestion`, which project the key away at the
 * source rather than relying on a controller-level serializer; grading
 * happens server-side against the DB rows, never against anything the
 * client sent back.
 */
@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly playerService: PlayerService,
  ) {}

  // ---- Authoring (trainer / HR / org admin) ----

  async create(organizationId: string, dto: CreateAssessmentDto): Promise<AssessmentForAuthor> {
    if (dto.contentItemId) await this.assertAttachableContentItem(organizationId, dto.contentItemId);

    const assessment = await this.prisma.assessment.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description ?? null,
        passingScore: dto.passingScore ?? 70,
        attemptLimit: dto.attemptLimit ?? null,
        contentItemId: dto.contentItemId ?? null,
      },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    });
    return { ...assessment, courseRef: await this.courseRefFor(organizationId, assessment.contentItemId) };
  }

  async update(organizationId: string, id: string, dto: UpdateAssessmentDto): Promise<AssessmentForAuthor> {
    const existing = await this.findOrThrow(organizationId, id);
    if (dto.contentItemId && dto.contentItemId !== existing.contentItemId) {
      await this.assertAttachableContentItem(organizationId, dto.contentItemId);
    }

    const assessment = await this.prisma.assessment.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.passingScore !== undefined ? { passingScore: dto.passingScore } : {}),
        ...(dto.attemptLimit !== undefined ? { attemptLimit: dto.attemptLimit } : {}),
        ...(dto.contentItemId !== undefined ? { contentItemId: dto.contentItemId } : {}),
      },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    });
    return { ...assessment, courseRef: await this.courseRefFor(organizationId, assessment.contentItemId) };
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.findOrThrow(organizationId, id);
    const attempts = await this.prisma.assessmentAttempt.count({ where: { organizationId, assessmentId: existing.id } });
    if (attempts > 0) {
      // Attempts are a learner's record of achievement, and they cascade
      // with the assessment row. Authors archive the owning content item
      // instead of deleting history.
      throw new ConflictException('This assessment already has learner attempts and cannot be deleted');
    }
    await this.prisma.assessment.delete({ where: { id: existing.id } });
  }

  async list(organizationId: string, query: ListAssessmentsQueryDto): Promise<PaginatedAssessments> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.AssessmentWhereInput = {
      organizationId,
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.courseId ? { contentItem: { module: { courseId: query.courseId } } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { questions: true, attempts: true } },
          contentItem: { select: { module: { select: { course: { select: { id: true, title: true } } } } } },
        },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    const items = rows.map(({ _count, contentItem, ...assessment }) => ({
      ...assessment,
      questionCount: _count.questions,
      attemptCount: _count.attempts,
      courseRef: contentItem?.module.course ?? null,
    }));
    return { items, page, pageSize, total };
  }

  /** Author view — includes `correctIndex`. Never reachable without `course:update`. */
  async getForAuthor(organizationId: string, id: string): Promise<AssessmentForAuthor> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, organizationId },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return { ...assessment, courseRef: await this.courseRefFor(organizationId, assessment.contentItemId) };
  }

  async addQuestion(organizationId: string, assessmentId: string, dto: UpsertQuestionDto): Promise<Question> {
    const assessment = await this.findOrThrow(organizationId, assessmentId);
    this.assertCorrectIndexInRange(dto);
    return this.prisma.question.create({
      data: {
        organizationId,
        assessmentId: assessment.id,
        text: dto.text,
        options: dto.options,
        correctIndex: dto.correctIndex,
        points: dto.points ?? 1,
      },
    });
  }

  async updateQuestion(
    organizationId: string,
    assessmentId: string,
    questionId: string,
    dto: UpsertQuestionDto,
  ): Promise<Question> {
    await this.findOrThrow(organizationId, assessmentId);
    this.assertCorrectIndexInRange(dto);
    const question = await this.prisma.question.findFirst({ where: { id: questionId, organizationId, assessmentId } });
    if (!question) throw new NotFoundException('Question not found');
    return this.prisma.question.update({
      where: { id: question.id },
      data: { text: dto.text, options: dto.options, correctIndex: dto.correctIndex, points: dto.points ?? 1 },
    });
  }

  async removeQuestion(organizationId: string, assessmentId: string, questionId: string): Promise<void> {
    await this.findOrThrow(organizationId, assessmentId);
    const question = await this.prisma.question.findFirst({ where: { id: questionId, organizationId, assessmentId } });
    if (!question) throw new NotFoundException('Question not found');
    await this.prisma.question.delete({ where: { id: question.id } });
  }

  /** Trainer "Submissions" view: every attempt on one assessment, newest first. */
  async listAttempts(organizationId: string, assessmentId: string): Promise<AttemptWithLearner[]> {
    await this.findOrThrow(organizationId, assessmentId);
    return this.prisma.assessmentAttempt.findMany({
      where: { organizationId, assessmentId },
      orderBy: { submittedAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  // ---- Learner ----

  async getForLearner(organizationId: string, assessmentId: string, learnerId: string): Promise<AssessmentForLearner> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: { questions: { orderBy: { createdAt: 'asc' } } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertLearnerMayTake(organizationId, assessment, learnerId);

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { organizationId, assessmentId, userId: learnerId },
      orderBy: { submittedAt: 'desc' },
    });

    const attemptsUsed = attempts.length;
    const attemptsRemaining =
      assessment.attemptLimit === null ? null : Math.max(0, assessment.attemptLimit - attemptsUsed);
    const alreadyPassed = attempts.some((attempt) => attempt.passed);

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      passingScore: assessment.passingScore,
      attemptLimit: assessment.attemptLimit,
      attemptsUsed,
      attemptsRemaining,
      canAttempt: !alreadyPassed && (attemptsRemaining === null || attemptsRemaining > 0),
      totalPoints: assessment.questions.reduce((sum, question) => sum + question.points, 0),
      questions: assessment.questions.map(toLearnerQuestion),
      lastAttempt: attempts[0] ? toAttemptResult(attempts[0]) : null,
      bestAttempt: bestOf(attempts),
    };
  }

  /** Every attempt this learner has made, across assessments — the learner "Assessments" screen. */
  async listMyAttempts(organizationId: string, learnerId: string): Promise<MyAttemptSummary[]> {
    return this.prisma.assessmentAttempt.findMany({
      where: { organizationId, userId: learnerId },
      orderBy: { submittedAt: 'desc' },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            passingScore: true,
            contentItem: { select: { module: { select: { course: { select: { id: true, title: true } } } } } },
          },
        },
      },
    });
  }

  /**
   * Grades a submission server-side and persists the attempt. Guards
   * against the invalid-submission shapes Task 19 names: exceeding the
   * attempt limit, resubmitting after a pass, and an answer set that
   * doesn't correspond exactly to this assessment's questions (missing,
   * duplicated, foreign, or an out-of-range option index).
   */
  async submit(
    organizationId: string,
    assessmentId: string,
    learnerId: string,
    dto: SubmitAssessmentDto,
  ): Promise<AttemptResult & { totalPoints: number; earnedPoints: number }> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: { questions: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.questions.length === 0) throw new BadRequestException('This assessment has no questions yet');
    await this.assertLearnerMayTake(organizationId, assessment, learnerId);

    const priorAttempts = await this.prisma.assessmentAttempt.findMany({
      where: { organizationId, assessmentId, userId: learnerId },
    });
    if (priorAttempts.some((attempt) => attempt.passed)) {
      throw new ConflictException('You have already passed this assessment');
    }
    if (assessment.attemptLimit !== null && priorAttempts.length >= assessment.attemptLimit) {
      throw new ConflictException('You have used all attempts for this assessment');
    }

    const answers = this.validateAnswers(assessment.questions, dto);

    const totalPoints = assessment.questions.reduce((sum, question) => sum + question.points, 0);
    const byId = new Map(assessment.questions.map((question) => [question.id, question]));
    const earnedPoints = answers.reduce((sum, answer) => {
      const question = byId.get(answer.questionId)!;
      return sum + (answer.selectedIndex === question.correctIndex ? question.points : 0);
    }, 0);
    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= assessment.passingScore;

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        organizationId,
        userId: learnerId,
        assessmentId: assessment.id,
        score,
        passed,
        answers: answers as unknown as Prisma.InputJsonValue,
      },
    });

    if (passed && assessment.contentItemId) {
      await this.completeLinkedContentItem(organizationId, assessment.contentItemId, learnerId);
    }

    return { ...toAttemptResult(attempt), totalPoints, earnedPoints };
  }

  // ---- internals ----

  private validateAnswers(questions: Question[], dto: SubmitAssessmentDto): StoredAnswer[] {
    const byId = new Map(questions.map((question) => [question.id, question]));
    const seen = new Set<string>();

    for (const answer of dto.answers) {
      const question = byId.get(answer.questionId);
      if (!question) {
        throw new BadRequestException('Submission contains an answer for a question outside this assessment');
      }
      if (seen.has(answer.questionId)) {
        throw new BadRequestException('Submission contains more than one answer for the same question');
      }
      seen.add(answer.questionId);
      if (answer.selectedIndex >= question.options.length) {
        throw new BadRequestException('Submission selected an option that does not exist');
      }
    }
    if (seen.size !== byId.size) {
      throw new BadRequestException('Every question must be answered');
    }
    return dto.answers.map((answer) => ({ questionId: answer.questionId, selectedIndex: answer.selectedIndex }));
  }

  /**
   * A passed quiz completes its QUIZ content item, which feeds the same
   * enrollment rollup (and therefore certificate issuance) as any other
   * content item. No-ops for a learner with no enrollment on that course —
   * the attempt is still recorded, it just has nothing to advance.
   */
  private async completeLinkedContentItem(
    organizationId: string,
    contentItemId: string,
    learnerId: string,
  ): Promise<void> {
    const contentItem = await this.prisma.contentItem.findFirst({
      where: { id: contentItemId, organizationId },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!contentItem) return;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_userId_courseId: { organizationId, userId: learnerId, courseId: contentItem.module.courseId },
      },
    });
    if (!enrollment) return;

    const now = new Date();
    await this.prisma.contentProgress.upsert({
      where: { enrollmentId_contentItemId: { enrollmentId: enrollment.id, contentItemId } },
      update: { status: 'COMPLETED', completedAt: now, lastAccessedAt: now },
      create: {
        organizationId,
        enrollmentId: enrollment.id,
        contentItemId,
        status: 'COMPLETED',
        completedAt: now,
        lastAccessedAt: now,
      },
    });
    await this.playerService.rollUpEnrollmentStatus(organizationId, enrollment.id, contentItem.module.courseId);
  }

  /**
   * An assessment attached to course content is only takeable by someone
   * enrolled in that course. A standalone assessment (no content item) is
   * open to any member of the organization.
   */
  private async assertLearnerMayTake(
    organizationId: string,
    assessment: Assessment,
    learnerId: string,
  ): Promise<void> {
    if (!assessment.contentItemId) return;
    const contentItem = await this.prisma.contentItem.findFirst({
      where: { id: assessment.contentItemId, organizationId },
      select: { module: { select: { courseId: true } } },
    });
    if (!contentItem) return;
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_userId_courseId: { organizationId, userId: learnerId, courseId: contentItem.module.courseId },
      },
    });
    if (!enrollment) throw new ForbiddenException('You are not enrolled in the course this assessment belongs to');
  }

  private async assertAttachableContentItem(organizationId: string, contentItemId: string): Promise<void> {
    const contentItem = await this.prisma.contentItem.findFirst({ where: { id: contentItemId, organizationId } });
    if (!contentItem) throw new BadRequestException('Invalid content item for this organization');
    if (contentItem.type !== 'QUIZ') throw new BadRequestException('Only a QUIZ content item can back an assessment');
    const taken = await this.prisma.assessment.findUnique({ where: { contentItemId } });
    if (taken) throw new ConflictException('That content item already has an assessment');
  }

  private assertCorrectIndexInRange(dto: UpsertQuestionDto): void {
    if (dto.correctIndex >= dto.options.length) {
      throw new BadRequestException('correctIndex must point at one of the supplied options');
    }
  }

  private async findOrThrow(organizationId: string, id: string): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findFirst({ where: { id, organizationId } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  private async courseRefFor(organizationId: string, contentItemId: string | null) {
    if (!contentItemId) return null;
    const contentItem = await this.prisma.contentItem.findFirst({
      where: { id: contentItemId, organizationId },
      select: { module: { select: { course: { select: { id: true, title: true } } } } },
    });
    return contentItem?.module.course ?? null;
  }
}

function toLearnerQuestion(question: Question): LearnerQuestion {
  return { id: question.id, text: question.text, options: question.options, points: question.points };
}

function toAttemptResult(attempt: AssessmentAttempt): AttemptResult {
  return { id: attempt.id, score: attempt.score, passed: attempt.passed, submittedAt: attempt.submittedAt };
}

function bestOf(attempts: AssessmentAttempt[]): AttemptResult | null {
  if (attempts.length === 0) return null;
  return toAttemptResult(attempts.reduce((best, attempt) => (attempt.score > best.score ? attempt : best)));
}

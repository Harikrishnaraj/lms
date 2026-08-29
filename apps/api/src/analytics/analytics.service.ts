import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';
import { AnalyticsCourseQueryDto } from './dto/analytics-query.dto';

export interface OverviewMetrics {
  totalLearners: number;
  totalCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  averageAssessmentScore: number;
  totalCertificatesIssued: number;
  weeklyTrends: { label: string; count: number }[];
}

export interface CourseAnalyticsItem {
  courseId: string;
  title: string;
  status: string;
  difficulty: string | null;
  totalEnrollments: number;
  completedCount: number;
  inProgressCount: number;
  completionRate: number;
  averageScore: number | null;
}

export interface DepartmentComplianceItem {
  departmentId: string;
  name: string;
  userCount: number;
  mandatoryEnrollments: number;
  completedMandatory: number;
  complianceRate: number;
}

export interface LearnerMetrics {
  completedCourses: number;
  inProgressCourses: number;
  certificatesCount: number;
  averageQuizScore: number | null;
  estimatedHoursLearned: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async getOverview(organizationId: string): Promise<OverviewMetrics> {
    const [
      totalLearners,
      totalCourses,
      enrollments,
      attempts,
      certificates,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.course.count({ where: { organizationId, status: 'PUBLISHED' } }),
      this.prisma.enrollment.findMany({
        where: { organizationId },
        select: { status: true, completedAt: true },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { organizationId },
        select: { score: true },
      }),
      this.prisma.certificate.count({ where: { organizationId, status: 'ACTIVE' } }),
    ]);

    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const averageAssessmentScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;

    // Weekly completion trends (past 4 weeks)
    const now = new Date();
    const weeklyTrends = [4, 3, 2, 1].map((weekOffset) => {
      const start = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - (weekOffset - 1) * 7 * 24 * 60 * 60 * 1000);
      const count = enrollments.filter(
        (e) => e.completedAt && new Date(e.completedAt) >= start && new Date(e.completedAt) < end,
      ).length;
      return { label: `Week ${5 - weekOffset}`, count };
    });

    return {
      totalLearners,
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate,
      averageAssessmentScore,
      totalCertificatesIssued: certificates,
      weeklyTrends,
    };
  }

  async getCourseAnalytics(
    organizationId: string,
    query?: AnalyticsCourseQueryDto,
  ): Promise<CourseAnalyticsItem[]> {
    const courses = await this.prisma.course.findMany({
      where: { organizationId },
      include: {
        enrollments: {
          where: query?.departmentId ? { user: { departmentId: query.departmentId } } : undefined,
          select: { status: true },
        },
        modules: {
          include: {
            contentItems: {
              where: { type: 'QUIZ' },
              include: {
                assessment: {
                  include: {
                    attempts: { select: { score: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return courses.map((c) => {
      const totalEnrollments = c.enrollments.length;
      const completedCount = c.enrollments.filter((e) => e.status === 'COMPLETED').length;
      const inProgressCount = c.enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
      const completionRate = totalEnrollments > 0 ? Math.round((completedCount / totalEnrollments) * 100) : 0;

      // Calculate average score across quiz attempts in this course
      const allScores: number[] = [];
      for (const m of c.modules) {
        for (const ci of m.contentItems) {
          if (ci.assessment?.attempts) {
            for (const att of ci.assessment.attempts) {
              allScores.push(att.score);
            }
          }
        }
      }

      const averageScore =
        allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

      return {
        courseId: c.id,
        title: c.title,
        status: c.status,
        difficulty: c.difficulty,
        totalEnrollments,
        completedCount,
        inProgressCount,
        completionRate,
        averageScore,
      };
    });
  }

  async getDepartmentCompliance(organizationId: string): Promise<DepartmentComplianceItem[]> {
    const departments = await this.prisma.department.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        users: {
          select: {
            id: true,
            enrollments: {
              where: { isMandatory: true },
              select: { status: true },
            },
          },
        },
      },
    });

    return departments.map((d) => {
      let mandatoryEnrollments = 0;
      let completedMandatory = 0;

      for (const u of d.users) {
        for (const e of u.enrollments) {
          mandatoryEnrollments++;
          if (e.status === 'COMPLETED') {
            completedMandatory++;
          }
        }
      }

      const complianceRate =
        mandatoryEnrollments > 0 ? Math.round((completedMandatory / mandatoryEnrollments) * 100) : 100;

      return {
        departmentId: d.id,
        name: d.name,
        userCount: d.users.length,
        mandatoryEnrollments,
        completedMandatory,
        complianceRate,
      };
    });
  }

  async getLearnerAnalytics(organizationId: string, userId: string): Promise<LearnerMetrics> {
    const [enrollments, certificates, attempts] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { organizationId, userId },
        select: { status: true },
      }),
      this.prisma.certificate.count({
        where: { organizationId, userId, status: 'ACTIVE' },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { organizationId, userId },
        select: { score: true },
      }),
    ]);

    const completedCourses = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const inProgressCourses = enrollments.filter((e) => e.status === 'IN_PROGRESS').length;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const averageQuizScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : null;
    const estimatedHoursLearned = completedCourses * 2 + inProgressCourses * 1;

    return {
      completedCourses,
      inProgressCourses,
      certificatesCount: certificates,
      averageQuizScore,
      estimatedHoursLearned,
    };
  }
}

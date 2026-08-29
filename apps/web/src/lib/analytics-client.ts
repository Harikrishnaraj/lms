'use client';

import { apiFetch } from './api-client';

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

export function getOverviewAnalytics(): Promise<OverviewMetrics> {
  return apiFetch('/organizations/me/analytics/overview');
}

export function getCourseAnalytics(departmentId?: string): Promise<CourseAnalyticsItem[]> {
  const usp = new URLSearchParams();
  if (departmentId) usp.set('departmentId', departmentId);
  const q = usp.toString();
  return apiFetch(`/organizations/me/analytics/courses${q ? `?${q}` : ''}`);
}

export function getDepartmentCompliance(): Promise<DepartmentComplianceItem[]> {
  return apiFetch('/organizations/me/analytics/departments');
}

export function getLearnerAnalytics(): Promise<LearnerMetrics> {
  return apiFetch('/organizations/me/analytics/learner');
}

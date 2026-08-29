'use client';

import { apiFetch } from './api-client';

export interface QuestionView {
  id: string;
  text: string;
  options: string[];
  points: number;
}

export interface AssessmentView {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  attemptLimit: number | null;
  questions: QuestionView[];
}

export interface GradedQuestionResult {
  id: string;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  points: number;
}

export interface SubmitAssessmentResult {
  attemptId: string;
  score: number;
  passed: boolean;
  gradedQuestions: GradedQuestionResult[];
}

export function getAssessment(id: string): Promise<AssessmentView> {
  return apiFetch(`/organizations/me/my-assessments/${id}`);
}

export function submitAssessment(id: string, answers: Record<string, number>): Promise<SubmitAssessmentResult> {
  const payloadAnswers = Object.entries(answers).map(([questionId, selectedIndex]) => ({
    questionId,
    selectedIndex,
  }));
  return apiFetch(`/organizations/me/my-assessments/${id}/submit`, {
    method: 'POST',
    body: { answers: payloadAnswers },
  });
}

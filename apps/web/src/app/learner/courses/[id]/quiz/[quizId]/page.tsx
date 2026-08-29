'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, CircleAlert, CircleCheck, ClipboardList, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, ErrorState, FullPageLoader, ProgressBar } from '@lms/ui';
import { getAssessment, submitAssessment, type AssessmentView, type SubmitAssessmentResult } from '../../../../../../lib/assessments-client';
import { isNotFound, isUnauthorized } from '../../../../../../lib/api-client';

export default function LearnerQuizPage() {
  const params = useParams<{ id: string; quizId: string }>();
  const enrollmentId = params.id;
  const quizId = params.quizId;

  const [quiz, setQuiz] = React.useState<AssessmentView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  
  // State for quiz attempt
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<SubmitAssessmentResult | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAssessment(quizId);
      setQuiz(data);
    } catch (err) {
      setError({ status: (err as { status?: number }).status });
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (result) return; // Prevent change after submission
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || result || submitting) return;

    setSubmitting(true);
    try {
      const submitResult = await submitAssessment(quizId, answers);
      setResult(submitResult);
    } catch {
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
  };

  if (loading) return <FullPageLoader label="Loading quiz..." />;
  if (error) {
    if (isNotFound(error)) {
      return <ErrorState title="Quiz not found" description="This assessment quiz does not exist." />;
    }
    if (isUnauthorized(error)) {
      return <ErrorState title="Access denied" description="You do not have access to this assessment." />;
    }
    return <ErrorState onRetry={() => void load()} />;
  }

  if (!quiz) return null;

  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === totalQuestions;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6 p-4">
      <div>
        <Link
          href={`/learner/courses/${enrollmentId}`}
          className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to course player
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <ClipboardList className="size-8 text-primary" />
          <div>
            <h1 className="text-h2 text-foreground font-semibold">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-body-sm text-muted-foreground mt-1">{quiz.description}</p>
            )}
          </div>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg">Quiz Guidelines</CardTitle>
              <CardDescription>
                Passing Score: <strong className="text-foreground">{quiz.passingScore}%</strong> | Total Questions: <strong className="text-foreground">{totalQuestions}</strong>
                {quiz.attemptLimit ? ` | Maximum Attempts: ${quiz.attemptLimit}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 bg-navy-50/20 p-4 rounded-md border border-border">
                <span className="text-body-sm text-muted-foreground">
                  Answered: <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions
                </span>
                <ProgressBar value={(answeredCount / totalQuestions) * 100} className="w-1/2 max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            {quiz.questions.map((q, index) => (
              <Card key={q.id} className="relative overflow-hidden">
                <CardHeader className="bg-navy-50/10 border-b border-border py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Question {index + 1}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {q.points} {q.points === 1 ? 'point' : 'points'}
                    </Badge>
                  </div>
                  <h3 className="text-body-md font-medium text-foreground mt-2">{q.text}</h3>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    {q.options.map((option, optIdx) => {
                      const isSelected = answers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`flex items-start gap-3 w-full rounded-md border px-4 py-3 text-left text-body-sm transition-all ${
                            isSelected
                              ? 'border-primary bg-navy-50/30 text-foreground ring-1 ring-primary'
                              : 'border-border hover:bg-navy-50/10 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1 leading-snug">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-body-sm text-muted-foreground">
              {!isComplete ? 'Please answer all questions before submitting.' : 'All questions answered!'}
            </span>
            <Button type="submit" disabled={!isComplete || submitting} size="md">
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className={`border-t-4 ${result.passed ? 'border-t-success-600' : 'border-t-error-600'}`}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-navy-50/50 mb-2">
                {result.passed ? (
                  <CircleCheck className="size-8 text-success-600" />
                ) : (
                  <CircleAlert className="size-8 text-error-600" />
                )}
              </div>
              <CardTitle className="text-h3">
                {result.passed ? 'Assessment Passed!' : 'Assessment Failed'}
              </CardTitle>
              <CardDescription className="mt-1">
                You achieved a score of <strong className="text-foreground">{result.score}%</strong>.
                Required passing score is <strong className="text-foreground">{quiz.passingScore}%</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-2">
              {result.passed ? (
                <p className="text-body-sm text-success-700 bg-success-50/50 py-3 px-4 rounded-md border border-success-200">
                  Congratulations! This module has been marked complete.
                </p>
              ) : (
                <p className="text-body-sm text-error-700 bg-error-50/50 py-3 px-4 rounded-md border border-error-200">
                  You did not meet the passing score. Review the material and try again.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-3 border-t border-border p-4 bg-navy-50/5">
              <Link href={`/learner/courses/${enrollmentId}`}>
                <Button variant="secondary" size="sm">
                  Back to Course
                </Button>
              </Link>
              {!result.passed && (
                <Button onClick={handleRetry} size="sm">
                  Retry Quiz
                </Button>
              )}
            </CardFooter>
          </Card>

          <h2 className="text-body-lg font-bold text-foreground">Review Questions</h2>
          <div className="flex flex-col gap-6">
            {result.gradedQuestions.map((q, index) => {
              const wasCorrect = q.isCorrect;
              return (
                <Card key={q.id} className="relative overflow-hidden border border-border">
                  <CardHeader className="bg-navy-50/10 py-3 border-b border-border flex flex-row items-center justify-between">
                    <span className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Question {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {wasCorrect ? (
                        <span className="inline-flex items-center gap-1 text-success-600 text-xs font-semibold bg-success-50 px-2 py-0.5 rounded">
                          <CircleCheck className="size-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-error-600 text-xs font-semibold bg-error-50 px-2 py-0.5 rounded">
                          <XCircle className="size-3.5" /> Incorrect
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {wasCorrect ? q.points : 0} / {q.points} {q.points === 1 ? 'point' : 'points'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <h3 className="text-body-md font-medium text-foreground mb-4">{q.text}</h3>
                    <div className="flex flex-col gap-2">
                      {q.options.map((option, optIdx) => {
                        const isSelected = q.selectedIndex === optIdx;
                        const isCorrect = q.correctIndex === optIdx;

                        let borderClass = 'border-border';
                        let bgClass = '';
                        let textClass = 'text-muted-foreground';

                        if (isCorrect) {
                          borderClass = 'border-success-500 ring-1 ring-success-500';
                          bgClass = 'bg-success-50/30';
                          textClass = 'text-success-700 font-medium';
                        } else if (isSelected && !wasCorrect) {
                          borderClass = 'border-error-500 ring-1 ring-error-500';
                          bgClass = 'bg-error-50/30';
                          textClass = 'text-error-700 font-medium';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-start gap-3 rounded-md border px-4 py-3 text-body-sm transition-all ${borderClass} ${bgClass} ${textClass}`}
                          >
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                                isCorrect
                                  ? 'border-success-600 bg-success-600 text-white'
                                  : isSelected
                                  ? 'border-error-600 bg-error-600 text-white'
                                  : 'border-border'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1 leading-snug">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

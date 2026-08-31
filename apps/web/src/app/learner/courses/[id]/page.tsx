'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CircleCheck, FileText, Link as LinkIcon, PlayCircle, ClipboardList, Award } from 'lucide-react';
import { Badge, Button, Card, CardContent, ErrorState, FullPageLoader, ProgressBar } from '@lms/ui';
import { isNotFound, isUnauthorized } from '../../../../lib/api-client';
import {
  countCompleted,
  getPlayer,
  markContentProgress,
  type PlayerContentItem,
  type PlayerView,
} from '../../../../lib/player-client';

function ContentTypeIcon({ type }: { type: PlayerContentItem['type'] }) {
  if (type === 'VIDEO') return <PlayCircle className="size-4 shrink-0" aria-hidden="true" />;
  if (type === 'TEXT') return <FileText className="size-4 shrink-0" aria-hidden="true" />;
  if (type === 'QUIZ') return <ClipboardList className="size-4 shrink-0" aria-hidden="true" />;
  return <LinkIcon className="size-4 shrink-0" aria-hidden="true" />;
}

export default function CoursePlayerPage() {
  const params = useParams<{ id: string }>();
  const enrollmentId = params.id;

  const [view, setView] = React.useState<PlayerView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ status?: number } | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [marking, setMarking] = React.useState(false);

  const load = React.useCallback(
    async (preserveSelection: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPlayer(enrollmentId);
        setView(result);
        if (!preserveSelection) {
          setSelectedId(result.resumeContentItemId ?? result.modules[0]?.contentItems[0]?.id ?? null);
        }
      } catch (err) {
        setError({ status: (err as { status?: number }).status });
      } finally {
        setLoading(false);
      }
    },
    [enrollmentId],
  );

  React.useEffect(() => {
    void load(false);
  }, [load]);

  const items = React.useMemo(() => view?.modules.flatMap((m) => m.contentItems) ?? [], [view]);
  const selectedIndex = items.findIndex((ci) => ci.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const selectItem = React.useCallback(
    async (contentItemId: string) => {
      setSelectedId(contentItemId);
      const item = items.find((ci) => ci.id === contentItemId);
      if (item && item.status === 'NOT_STARTED') {
        try {
          const result = await markContentProgress(enrollmentId, contentItemId, 'IN_PROGRESS');
          setView(result);
        } catch {
          // Non-fatal: viewing still works even if the "opened" tick fails to persist.
        }
      }
    },
    [enrollmentId, items],
  );

  const handleMarkComplete = React.useCallback(async () => {
    if (!selected) return;
    setMarking(true);
    try {
      const result = await markContentProgress(enrollmentId, selected.id, 'COMPLETED');
      setView(result);
    } finally {
      setMarking(false);
    }
  }, [enrollmentId, selected]);

  if (loading) return <FullPageLoader label="Loading course" />;
  if (error) {
    if (isNotFound(error)) {
      return <ErrorState title="Enrollment not found" description="This enrollment may no longer exist." />;
    }
    if (isUnauthorized(error)) {
      return (
        <ErrorState
          title="You don't have access to this course"
          description="Ask your administrator if you believe this is a mistake."
        />
      );
    }
    return <ErrorState onRetry={() => void load(true)} />;
  }
  if (!view) return null;

  const { completed, total } = countCompleted(view);
  const progressPct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/learner/courses"
          className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-primary hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to my learning
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-h2 text-foreground">{view.course.title}</h1>
            <div className="flex gap-2 items-center mt-2">
              {view.enrollment.status === 'COMPLETED' && (
                <>
                  <Badge variant="success">Completed</Badge>
                  <Link href="/learner/certificates">
                    <Button variant="secondary" size="sm" className="inline-flex items-center gap-1.5 py-1">
                      <Award className="size-4" /> Claim Certificate
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <ProgressBar value={progressPct} showValue className="mt-4 max-w-sm" label={`${completed} of ${total} complete`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Course modules" className="flex flex-col gap-4">
          {view.modules.map((module) => (
            <div key={module.id}>
              <p className="mb-1.5 px-1 text-label-sm font-medium uppercase tracking-wide text-muted-foreground">
                {module.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {module.contentItems.map((ci) => (
                  <li key={ci.id}>
                    <button
                      type="button"
                      onClick={() => void selectItem(ci.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm transition-colors ${
                        ci.id === selectedId
                          ? 'bg-navy-50 text-primary'
                          : 'text-foreground hover:bg-navy-50/60'
                      }`}
                    >
                      {ci.status === 'COMPLETED' ? (
                        <CircleCheck className="size-4 shrink-0 text-success-600" aria-hidden="true" />
                      ) : (
                        <ContentTypeIcon type={ci.type} />
                      )}
                      <span className="flex-1 truncate">{ci.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            {selected ? (
              <>
                <div>
                  <h2 className="text-h3 text-foreground">{selected.title}</h2>
                  {selected.status === 'COMPLETED' && (
                    <Badge variant="success" className="mt-2">
                      Completed
                    </Badge>
                  )}
                </div>

                {selected.type === 'TEXT' && selected.textBody && (
                  <p className="whitespace-pre-wrap text-body-md text-foreground">{selected.textBody}</p>
                )}
                {selected.type === 'VIDEO' && selected.playbackUrl && (
                  <video controls src={selected.playbackUrl} className="w-full rounded-md bg-black" />
                )}
                {(selected.type === 'DOCUMENT' || selected.type === 'RESOURCE') && selected.playbackUrl && (
                  <a
                    href={selected.playbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 text-body-sm text-primary hover:underline"
                  >
                    <LinkIcon className="size-4" aria-hidden="true" />
                    Open {selected.type === 'DOCUMENT' ? 'document' : 'resource'}
                  </a>
                )}
                {selected.type === 'QUIZ' && selected.assessmentId && (
                  <div className="flex flex-col gap-4 items-center justify-center p-8 border border-dashed border-border rounded-lg bg-navy-50/20">
                    <ClipboardList className="size-16 text-primary" aria-hidden="true" />
                    <div className="text-center">
                      <h3 className="text-h4 text-foreground font-semibold">Module Assessment</h3>
                      <p className="text-body-sm text-muted-foreground mt-1">
                        Complete this quiz to test your understanding of the module.
                      </p>
                    </div>
                    {selected.status === 'COMPLETED' ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-success-600 font-medium inline-flex items-center gap-1.5">
                          <CircleCheck className="size-5" /> You passed this assessment!
                        </span>
                        <Link href={`/learner/courses/${enrollmentId}/quiz/${selected.assessmentId}`}>
                          <Button variant="secondary" size="sm" className="mt-2">
                            Review Attempt
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/learner/courses/${enrollmentId}/quiz/${selected.assessmentId}`}>
                        <Button size="md" className="mt-2">
                          Start Quiz
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedIndex <= 0}
                    onClick={() => items[selectedIndex - 1] && void selectItem(items[selectedIndex - 1].id)}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>

                  {selected.status !== 'COMPLETED' && (
                    <Button size="sm" disabled={marking} onClick={() => void handleMarkComplete()}>
                      {marking ? 'Marking…' : 'Mark complete'}
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedIndex < 0 || selectedIndex >= items.length - 1}
                    onClick={() => items[selectedIndex + 1] && void selectItem(items[selectedIndex + 1].id)}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-body-sm text-muted-foreground">This course has no content yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

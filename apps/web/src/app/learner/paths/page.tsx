'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, ProgressBar, Skeleton, Tabs, TabsList, TabsTrigger } from '@lms/ui';
import { isUnauthorized } from '../../../lib/api-client';
import {
  LEARNING_PATH_PROGRESS_LABEL,
  listLearningPathCatalog,
  listMyLearningPaths,
  type LearningPathWithProgress,
} from '../../../lib/learning-paths-client';

type LoadState = 'loading' | 'error' | 'forbidden' | 'ready';

function requiredCount(path: LearningPathWithProgress): { total: number; completed: number } {
  const required = path.progress.courses.filter((c) => c.isRequired);
  return { total: required.length, completed: required.filter((c) => c.enrollmentStatus === 'COMPLETED').length };
}

function progressBadgeVariant(status: LearningPathWithProgress['progress']['status']): 'default' | 'primary' | 'success' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'primary';
  return 'default';
}

function PathCard({ path }: { path: LearningPathWithProgress }) {
  const { total, completed } = requiredCount(path);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <Link href={`/learner/paths/${path.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-body-md font-medium text-foreground">{path.title}</h3>
            <Badge variant={progressBadgeVariant(path.progress.status)}>{LEARNING_PATH_PROGRESS_LABEL[path.progress.status]}</Badge>
          </div>
          {path.description && <p className="line-clamp-2 text-body-sm text-muted-foreground">{path.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {path.progress.isMandatory && <Badge variant="warning">Mandatory</Badge>}
            <span className="text-body-sm text-muted-foreground">
              {path.courses.length} course{path.courses.length === 1 ? '' : 's'}
            </span>
            {path.progress.dueDate && (
              <span className="text-body-sm text-muted-foreground">Due {new Date(path.progress.dueDate).toLocaleDateString()}</span>
            )}
          </div>
          {total > 0 && <ProgressBar value={percent} showValue />}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LearningPathsPage() {
  const [tab, setTab] = React.useState<'mine' | 'browse'>('mine');
  const [mine, setMine] = React.useState<LearningPathWithProgress[] | null>(null);
  const [browse, setBrowse] = React.useState<LearningPathWithProgress[] | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const [mineRes, browseRes] = await Promise.all([listMyLearningPaths(), listLearningPathCatalog()]);
      setMine(mineRes);
      setBrowse(browseRes.items);
      setState('ready');
    } catch (err) {
      setState(isUnauthorized(err) ? 'forbidden' : 'error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const mineIds = new Set((mine ?? []).map((p) => p.id));
  const notYetJoined = (browse ?? []).filter((p) => !mineIds.has(p.id));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Learning paths</h1>
        <p className="mt-1 text-body-md text-muted-foreground">Ordered course bundles for a role or program.</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'mine' | 'browse')}>
        <TabsList>
          <TabsTrigger value="mine">My paths</TabsTrigger>
          <TabsTrigger value="browse">Browse all</TabsTrigger>
        </TabsList>
      </Tabs>

      {state === 'forbidden' ? (
        <ErrorState title="You don't have access to learning paths" description="Ask your administrator if you believe this is a mistake." />
      ) : state === 'error' ? (
        <ErrorState onRetry={() => void load()} />
      ) : state === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : tab === 'mine' ? (
        mine && mine.length === 0 ? (
          <EmptyState
            title="You haven't joined any learning paths"
            description="Browse all paths to find one to start."
            action={<Button variant="secondary" onClick={() => setTab('browse')}>Browse all</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine?.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        )
      ) : notYetJoined.length === 0 && (browse ?? []).length > 0 ? (
        <EmptyState title="You're on every available path" description="Check back later for new learning paths." />
      ) : (browse ?? []).length === 0 ? (
        <EmptyState title="No learning paths published yet" description="Check back later." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notYetJoined.map((path) => (
            <PathCard key={path.id} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}

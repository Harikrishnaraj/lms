'use client';

import * as React from 'react';
import { EmptyState, ErrorState, Pagination, Skeleton } from '@lms/ui';
import { isUnauthorized } from '../../../lib/api-client';
import {
  listCatalog,
  listCatalogCategories,
  type CatalogCategory,
  type CatalogCourse,
} from '../../../lib/catalog-client';
import { selfEnroll } from '../../../lib/enrollments-client';
import { CatalogFilters, type CatalogFiltersValue } from '../../../components/catalog/CatalogFilters';
import { CatalogCourseCard } from '../../../components/catalog/CatalogCourseCard';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

type LoadState = 'loading' | 'error' | 'forbidden' | 'ready';

export default function LearnerCatalogPage() {
  const [filters, setFilters] = React.useState<CatalogFiltersValue>({ search: '' });
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);
  const [result, setResult] = React.useState<{ items: CatalogCourse[]; total: number } | null>(null);
  const [state, setState] = React.useState<LoadState>('loading');
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);

  // Debounce free-text search so we don't refetch on every keystroke.
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  // Any filter change resets pagination back to page 1.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.category, filters.difficulty]);

  React.useEffect(() => {
    listCatalogCategories()
      .then(setCategories)
      .catch(() => {
        // Non-fatal: the filter bar just falls back to "All categories" only.
      });
  }, []);

  const load = React.useCallback(async () => {
    setState('loading');
    try {
      const res = await listCatalog({
        search: debouncedSearch || undefined,
        category: filters.category,
        difficulty: filters.difficulty,
        page,
        pageSize: PAGE_SIZE,
      });
      setResult({ items: res.items, total: res.total });
      setState('ready');
    } catch (err) {
      if (isUnauthorized(err)) {
        setState('forbidden');
      } else {
        setState('error');
      }
    }
  }, [debouncedSearch, filters.category, filters.difficulty, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleEnroll = React.useCallback(
    async (courseId: string) => {
      setEnrollingId(courseId);
      try {
        await selfEnroll(courseId);
        await load();
      } catch {
        // Surface via a page-level error state rather than a silent failure.
        setState('error');
      } finally {
        setEnrollingId(null);
      }
    },
    [load],
  );

  const pageCount = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h2 text-foreground">Course catalog</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Browse courses available in your organization and enroll at your own pace.
        </p>
      </header>

      <CatalogFilters value={filters} onChange={setFilters} categories={categories} />

      {state === 'forbidden' ? (
        <ErrorState
          title="You don't have access to the catalog"
          description="Ask your administrator if you believe this is a mistake."
        />
      ) : state === 'error' ? (
        <ErrorState onRetry={() => void load()} />
      ) : state === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : result && result.items.length === 0 ? (
        <EmptyState
          title="No courses found"
          description="Try adjusting your search or filters."
        />
      ) : (
        result && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((course) => (
                <CatalogCourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                  enrolling={enrollingId === course.id}
                />
              ))}
            </div>
            {pageCount > 1 && (
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="self-center" />
            )}
          </>
        )
      )}
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, BookOpen, GraduationCap, Users } from 'lucide-react';
import { EmptyState, ErrorState } from '@lms/ui';
import { globalSearch, type SearchResultItem } from '../../../lib/search-client';

export default function LearnerSearchPage() {
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [results, setResults] = React.useState<SearchResultItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const performSearch = React.useCallback(async (q: string, filter: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const typeParam = filter === 'all' ? undefined : filter;
      const data = await globalSearch(q, typeParam);
      setResults(data);
    } catch {
      setError('An error occurred while executing search.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void performSearch(query, typeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, typeFilter, performSearch]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'COURSE':
        return BookOpen;
      case 'PATH':
        return GraduationCap;
      case 'USER':
        return Users;
      default:
        return Search;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <header>
        <h1 className="text-h2 text-foreground font-semibold">Global Search</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Find courses, learning paths, or team members across your organization.
        </p>
      </header>

      {/* Control bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type at least 2 characters to search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-body-md text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-body-md text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All types</option>
          <option value="courses">Courses</option>
          <option value="paths">Learning Paths</option>
        </select>
      </div>

      {/* Results presentation */}
      {error ? (
        <ErrorState onRetry={() => void performSearch(query, typeFilter)} />
      ) : loading ? (
        <p className="text-center text-body-md text-muted-foreground py-8 animate-pulse">Searching…</p>
      ) : query.trim().length < 2 ? (
        <p className="text-center text-body-md text-muted-foreground py-12">
          Start typing to explore courses and programs.
        </p>
      ) : results && results.length === 0 ? (
        <EmptyState
          title="No results found"
          description={`We couldn't find anything matching "${query}". Try adjusting your keyword or filter.`}
        />
      ) : (
        results && (
          <div className="flex flex-col gap-2">
            {results.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/40 hover:bg-hover"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-body-md font-semibold text-foreground">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-caption text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

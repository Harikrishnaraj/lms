'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/cn';

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** How many page numbers to show around the current page. */
  siblingCount?: number;
}

function getPageRange(page: number, pageCount: number, siblingCount: number): (number | 'ellipsis')[] {
  const totalVisible = siblingCount * 2 + 5; // first + last + current + 2 ellipses
  if (pageCount <= totalVisible) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const left = Math.max(page - siblingCount, 2);
  const right = Math.min(page + siblingCount, pageCount - 1);

  const range: (number | 'ellipsis')[] = [1];
  if (left > 2) range.push('ellipsis');
  for (let i = left; i <= right; i += 1) range.push(i);
  if (right < pageCount - 1) range.push('ellipsis');
  range.push(pageCount);
  return range;
}

export function Pagination({ page, pageCount, onPageChange, siblingCount = 1, className, ...props }: PaginationProps) {
  const pages = getPageRange(page, pageCount, siblingCount);

  const buttonBase =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-body-sm transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)} {...props}>
      <button
        type="button"
        className={cn(buttonBase, 'text-muted-foreground hover:bg-navy-50 hover:text-primary')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, index) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground">
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              buttonBase,
              p === page
                ? 'bg-primary text-on-primary'
                : 'text-foreground hover:bg-navy-50 hover:text-primary',
            )}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className={cn(buttonBase, 'text-muted-foreground hover:bg-navy-50 hover:text-primary')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

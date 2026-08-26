'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './Input';
import { cn } from '../lib/cn';

export interface SearchInputProps extends Omit<InputProps, 'startIcon' | 'endIcon' | 'type'> {
  /** Called when the clear ("x") button is pressed. Omit to hide the button entirely. */
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    const hasValue = typeof value === 'string' && value.length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        role="searchbox"
        value={value}
        startIcon={<Search className="size-4" aria-hidden="true" />}
        endIcon={
          onClear && hasValue ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" />
            </button>
          ) : undefined
        }
        className={cn('[&::-webkit-search-cancel-button]:hidden', className)}
        {...props}
      />
    );
  },
);
SearchInput.displayName = 'SearchInput';

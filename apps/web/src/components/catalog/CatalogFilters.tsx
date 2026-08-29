'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SearchInput } from '@lms/ui';
import { DIFFICULTY_LABEL, DIFFICULTY_OPTIONS, type CatalogCategory, type CourseDifficulty } from '../../lib/catalog-client';

const ALL = '__all__';

export interface CatalogFiltersValue {
  search: string;
  category?: string;
  difficulty?: CourseDifficulty;
}

export interface CatalogFiltersProps {
  value: CatalogFiltersValue;
  onChange: (value: CatalogFiltersValue) => void;
  categories: CatalogCategory[];
}

export function CatalogFilters({ value, onChange, categories }: CatalogFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        placeholder="Search courses"
        value={value.search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, search: e.target.value })}
        onClear={() => onChange({ ...value, search: '' })}
        className="sm:max-w-xs"
        aria-label="Search courses"
      />

      <Select
        value={value.category ?? ALL}
        onValueChange={(next) => onChange({ ...value, category: next === ALL ? undefined : next })}
      >
        <SelectTrigger className="sm:w-48" aria-label="Filter by category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.difficulty ?? ALL}
        onValueChange={(next) =>
          onChange({ ...value, difficulty: next === ALL ? undefined : (next as CourseDifficulty) })
        }
      >
        <SelectTrigger className="sm:w-48" aria-label="Filter by difficulty">
          <SelectValue placeholder="All levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All levels</SelectItem>
          {DIFFICULTY_OPTIONS.map((difficulty) => (
            <SelectItem key={difficulty} value={difficulty}>
              {DIFFICULTY_LABEL[difficulty]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

'use client';

import { apiFetch } from './api-client';

export interface SearchResultItem {
  id: string;
  type: 'COURSE' | 'PATH' | 'USER';
  title: string;
  subtitle?: string;
  href: string;
}

export function globalSearch(q: string, type?: string): Promise<SearchResultItem[]> {
  const usp = new URLSearchParams();
  usp.set('q', q);
  if (type) usp.set('type', type);
  return apiFetch(`/organizations/me/search?${usp.toString()}`);
}

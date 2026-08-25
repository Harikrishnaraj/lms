import type EmbeddedPostgres from 'embedded-postgres';
import { startTestDatabase, stopTestDatabase, testDatabaseUrl } from './setup/embedded-db';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup({ provide }: { provide: (key: 'databaseUrl', value: string) => void }) {
  const pg: EmbeddedPostgres = await startTestDatabase();
  provide('databaseUrl', testDatabaseUrl());

  return async () => {
    await stopTestDatabase(pg);
  };
}

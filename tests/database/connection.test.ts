import { beforeAll, describe, expect, it, inject } from 'vitest';
import type { PrismaClient } from '@lms/database';

let prisma: PrismaClient;
let checkDatabaseConnection: () => Promise<boolean>;

beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  const database = await import('@lms/database');
  prisma = database.prisma;
  checkDatabaseConnection = database.checkDatabaseConnection;
});

describe('test database connection', () => {
  it('connects to the migrated test database', async () => {
    expect(await checkDatabaseConnection()).toBe(true);
  });

  it('creates and reads back an organization (tenant root)', async () => {
    const slug = `test-org-${Date.now()}`;
    const created = await prisma.organization.create({
      data: { name: 'Test Organization', slug },
    });

    const found = await prisma.organization.findUnique({ where: { id: created.id } });

    expect(found).not.toBeNull();
    expect(found?.slug).toBe(slug);
    expect(found?.status).toBe('ACTIVE');
  });

  it('enforces unique organization slugs', async () => {
    const slug = `duplicate-org-${Date.now()}`;
    await prisma.organization.create({ data: { name: 'First', slug } });

    await expect(prisma.organization.create({ data: { name: 'Second', slug } })).rejects.toThrow();
  });
});

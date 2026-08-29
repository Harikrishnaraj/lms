import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';

export interface SearchResultItem {
  id: string;
  type: 'COURSE' | 'PATH' | 'USER';
  title: string;
  subtitle?: string;
  href: string;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async search(
    organizationId: string,
    query: string,
    types: string[],
    hasUserViewPermission: boolean,
  ): Promise<SearchResultItem[]> {
    const results: SearchResultItem[] = [];
    const q = query.trim();

    const searchCourses = types.includes('courses');
    const searchPaths = types.includes('paths');
    const searchUsers = types.includes('users') && hasUserViewPermission;

    const promises: Promise<void>[] = [];

    if (searchCourses) {
      promises.push(
        (async () => {
          const courses = await this.prisma.course.findMany({
            where: {
              organizationId,
              status: 'PUBLISHED',
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, title: true, difficulty: true },
            take: 15,
          });
          results.push(
            ...courses.map((c) => ({
              id: c.id,
              type: 'COURSE' as const,
              title: c.title,
              subtitle: c.difficulty ? `Course · ${c.difficulty}` : 'Course',
              href: `/learner/catalog/${c.id}`,
            })),
          );
        })(),
      );
    }

    if (searchPaths) {
      promises.push(
        (async () => {
          const paths = await this.prisma.learningPath.findMany({
            where: {
              organizationId,
              status: 'PUBLISHED',
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, title: true },
            take: 15,
          });
          results.push(
            ...paths.map((p) => ({
              id: p.id,
              type: 'PATH' as const,
              title: p.title,
              subtitle: 'Learning Path',
              href: `/learner/paths/${p.id}`,
            })),
          );
        })(),
      );
    }

    if (searchUsers) {
      promises.push(
        (async () => {
          const users = await this.prisma.user.findMany({
            where: {
              organizationId,
              status: 'ACTIVE',
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { jobTitle: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
            take: 15,
          });
          results.push(
            ...users.map((u) => ({
              id: u.id,
              type: 'USER' as const,
              title: `${u.firstName} ${u.lastName}`,
              subtitle: u.jobTitle ? `Employee · ${u.jobTitle}` : 'Employee',
              href: `/admin/hr/users/${u.id}`,
            })),
          );
        })(),
      );
    }

    await Promise.all(promises);
    return results;
  }
}

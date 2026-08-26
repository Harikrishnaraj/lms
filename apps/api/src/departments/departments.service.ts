import { Inject, Injectable } from '@nestjs/common';
import type { Department, PrismaClient } from '@lms/database';
import { PRISMA_CLIENT } from '../database/database.constants';

@Injectable()
export class DepartmentsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(organizationId: string): Promise<Department[]> {
    return this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }
}

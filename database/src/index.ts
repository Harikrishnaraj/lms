export { prisma, checkDatabaseConnection } from './client';
export {
  PrismaClient,
  Prisma,
  RoleKey,
  UserStatus,
  DepartmentStatus,
  CourseStatus,
  CourseDifficulty,
  CourseVisibility,
} from '@prisma/client';
export type {
  Organization,
  OrganizationStatus,
  Role,
  Permission,
  RolePermission,
  Membership,
  User,
  Department,
  Course,
  Category,
} from '@prisma/client';

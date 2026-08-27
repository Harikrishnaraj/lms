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
  ContentType,
  ContentItemStatus,
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
  Module,
  ContentItem,
} from '@prisma/client';

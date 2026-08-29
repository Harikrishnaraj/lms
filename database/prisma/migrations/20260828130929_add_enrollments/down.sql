-- Rollback for 20260828130929_add_enrollments
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-content snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_assigned_by_id_fkey";

-- DropTable
DROP TABLE "enrollments";

-- DropEnum
DROP TYPE "EnrollmentStatus";

-- DropEnum
DROP TYPE "EnrollmentSource";

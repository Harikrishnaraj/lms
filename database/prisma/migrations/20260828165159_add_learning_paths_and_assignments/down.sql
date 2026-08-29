-- Rollback for 20260828165159_add_learning_paths_and_assignments
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-content snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_department_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_learning_path_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_course_id_fkey";

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_enrollments" DROP CONSTRAINT "learning_path_enrollments_assigned_by_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_enrollments" DROP CONSTRAINT "learning_path_enrollments_learning_path_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_enrollments" DROP CONSTRAINT "learning_path_enrollments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_enrollments" DROP CONSTRAINT "learning_path_enrollments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_courses" DROP CONSTRAINT "learning_path_courses_course_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_courses" DROP CONSTRAINT "learning_path_courses_learning_path_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_path_courses" DROP CONSTRAINT "learning_path_courses_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_paths" DROP CONSTRAINT "learning_paths_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "learning_paths" DROP CONSTRAINT "learning_paths_organization_id_fkey";

-- DropTable
DROP TABLE "assignments";

-- DropTable
DROP TABLE "learning_path_enrollments";

-- DropTable
DROP TABLE "learning_path_courses";

-- DropTable
DROP TABLE "learning_paths";

-- DropEnum
DROP TYPE "AssignmentScopeType";

-- DropEnum
DROP TYPE "AssignmentTargetType";

-- DropEnum
DROP TYPE "LearningPathStatus";

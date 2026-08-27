-- Rollback for 20260827050040_add_course_management
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-courses snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_instructor_id_fkey";

-- DropForeignKey
ALTER TABLE "_CourseCategories" DROP CONSTRAINT "_CourseCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "_CourseCategories" DROP CONSTRAINT "_CourseCategories_B_fkey";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "_CourseCategories";

-- DropEnum
DROP TYPE "CourseStatus";

-- DropEnum
DROP TYPE "CourseDifficulty";

-- DropEnum
DROP TYPE "CourseVisibility";

-- Rollback for 20260828145521_add_content_progress
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-content snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "content_progress" DROP CONSTRAINT "content_progress_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "content_progress" DROP CONSTRAINT "content_progress_enrollment_id_fkey";

-- DropForeignKey
ALTER TABLE "content_progress" DROP CONSTRAINT "content_progress_content_item_id_fkey";

-- DropTable
DROP TABLE "content_progress";

-- DropEnum
DROP TYPE "ContentProgressStatus";

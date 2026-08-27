-- Rollback for 20260827053113_add_course_structure_and_content
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-content snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_course_id_fkey";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "content_items_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "content_items_module_id_fkey";

-- DropTable
DROP TABLE "modules";

-- DropTable
DROP TABLE "content_items";

-- DropEnum
DROP TYPE "ContentType";

-- DropEnum
DROP TYPE "ContentItemStatus";

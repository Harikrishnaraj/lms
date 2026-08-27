-- Rollback for 20260826151706_add_department_management
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-dept-mgmt snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_manager_id_fkey";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "manager_id",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "DepartmentStatus";

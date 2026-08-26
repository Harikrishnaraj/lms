-- Rollback for 20260826092625_add_users_and_departments
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel <pre-users snapshot> --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_department_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_organization_id_fkey";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "departments";

-- DropEnum
DROP TYPE "UserStatus";

-- Rollback for 20260825083713_init_organization
-- Generated via: prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-empty --script
-- Prisma does not execute down.sql automatically; see database/README.md for the rollback procedure.

-- DropTable
DROP TABLE "public"."organizations";

-- DropEnum
DROP TYPE "public"."OrganizationStatus";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organization_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropTable
DROP TABLE "audit_logs";

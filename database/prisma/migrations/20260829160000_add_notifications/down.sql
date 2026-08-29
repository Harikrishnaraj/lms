-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organization_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_organization_id_fkey";
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_user_id_fkey";

-- DropTable
DROP TABLE "notification_preferences";
DROP TABLE "notifications";

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "certificate_validity_days";

-- DropEnum
DROP TYPE "NotificationType";

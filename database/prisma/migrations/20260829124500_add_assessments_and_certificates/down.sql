-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_organization_id_fkey";
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_content_item_id_fkey";
ALTER TABLE "questions" DROP CONSTRAINT "questions_organization_id_fkey";
ALTER TABLE "questions" DROP CONSTRAINT "questions_assessment_id_fkey";
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_organization_id_fkey";
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_user_id_fkey";
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_assessment_id_fkey";
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_organization_id_fkey";
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_user_id_fkey";
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_course_id_fkey";

-- DropTable
DROP TABLE "certificates";
DROP TABLE "assessment_attempts";
DROP TABLE "questions";
DROP TABLE "assessments";

-- DropEnum
DROP TYPE "CertificateStatus";

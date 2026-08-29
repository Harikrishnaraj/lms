-- CreateEnum
CREATE TYPE "ContentProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "content_progress" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "status" "ContentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completed_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_progress_organization_id_enrollment_id_idx" ON "content_progress"("organization_id", "enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_progress_enrollment_id_content_item_id_key" ON "content_progress"("enrollment_id", "content_item_id");

-- AddForeignKey
ALTER TABLE "content_progress" ADD CONSTRAINT "content_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_progress" ADD CONSTRAINT "content_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_progress" ADD CONSTRAINT "content_progress_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

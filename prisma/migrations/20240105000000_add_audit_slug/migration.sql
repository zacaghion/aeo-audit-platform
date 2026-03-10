-- AlterTable
ALTER TABLE "Audit" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Audit_slug_key" ON "Audit"("slug");

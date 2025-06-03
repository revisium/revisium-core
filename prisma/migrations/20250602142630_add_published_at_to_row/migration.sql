-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Row_publishedAt_idx" ON "Row"("publishedAt");

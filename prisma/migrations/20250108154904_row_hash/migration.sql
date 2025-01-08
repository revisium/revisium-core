/*
  Warnings:

  - Added the required column `hash` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "hash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Row_hash_idx" ON "Row"("hash");

/*
  Warnings:

  - Added the required column `schemaHash` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "schemaHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Row_schemaHash_idx" ON "Row"("schemaHash");

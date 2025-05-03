/*
  Warnings:

  - A unique constraint covering the columns `[createdId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdId` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "createdId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_createdId_key" ON "Organization"("createdId");

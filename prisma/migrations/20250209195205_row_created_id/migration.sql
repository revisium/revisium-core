/*
  Warnings:

  - Added the required column `createdId` to the `Row` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Row" ADD COLUMN     "createdId" TEXT NOT NULL;

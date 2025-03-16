/*
  Warnings:

  - You are about to drop the column `changelogId` on the `Revision` table. All the data in the column will be lost.
  - You are about to drop the `Changelog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Revision" DROP CONSTRAINT "Revision_changelogId_fkey";

-- DropIndex
DROP INDEX "Revision_changelogId_key";

-- AlterTable
ALTER TABLE "Revision" DROP COLUMN "changelogId";

-- DropTable
DROP TABLE "Changelog";

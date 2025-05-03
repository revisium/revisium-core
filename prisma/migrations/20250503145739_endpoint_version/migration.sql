/*
  Warnings:

  - Added the required column `versionId` to the `Endpoint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Endpoint" ADD COLUMN     "versionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EndpointVersion" (
    "id" TEXT NOT NULL,
    "type" "EndpointType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EndpointVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EndpointVersion_type_version_key" ON "EndpointVersion"("type", "version");

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "EndpointVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

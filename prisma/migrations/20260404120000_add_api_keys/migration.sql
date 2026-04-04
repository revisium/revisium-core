-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('PERSONAL', 'SERVICE', 'INTERNAL');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "type" "ApiKeyType" NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "serviceId" TEXT,
    "internalServiceName" TEXT,
    "organizationId" TEXT,
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branchNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tableIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permissions" JSONB,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_serviceId_key" ON "ApiKey"("serviceId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_type_idx" ON "ApiKey"("type");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

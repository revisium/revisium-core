-- CreateTable
CREATE TABLE "FileBlob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "size" BIGINT NOT NULL,

    CONSTRAINT "FileBlob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFileUsage" (
    "projectId" TEXT NOT NULL,
    "fileBytes" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFileUsage_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "TableMigration" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "sourceTableVersionId" TEXT NOT NULL,
    "shadowTableVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phase" TEXT NOT NULL DEFAULT 'INIT',
    "patches" JSONB NOT NULL,
    "previousSchema" JSONB NOT NULL,
    "previousSchemaHash" TEXT NOT NULL,
    "targetSchemaHash" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "copiedRows" INTEGER NOT NULL DEFAULT 0,
    "lastCopiedRowId" TEXT,
    "batchSize" INTEGER NOT NULL DEFAULT 1000,
    "currentBatch" INTEGER NOT NULL DEFAULT 0,
    "totalBatches" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastProgressAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "TableMigration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FileBlobToRow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FileBlobToRow_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "FileBlob_projectId_idx" ON "FileBlob"("projectId");

-- CreateIndex
CREATE INDEX "FileBlob_hash_idx" ON "FileBlob"("hash");

-- CreateIndex
CREATE INDEX "FileBlob_deletedAt_idx" ON "FileBlob"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileBlob_projectId_hash_key" ON "FileBlob"("projectId", "hash");

-- CreateIndex
CREATE INDEX "TableMigration_status_idx" ON "TableMigration"("status");

-- CreateIndex
CREATE INDEX "TableMigration_lockedBy_idx" ON "TableMigration"("lockedBy");

-- CreateIndex
CREATE INDEX "TableMigration_status_heartbeatAt_idx" ON "TableMigration"("status", "heartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "TableMigration_revisionId_tableId_key" ON "TableMigration"("revisionId", "tableId");

-- CreateIndex
CREATE INDEX "_FileBlobToRow_B_index" ON "_FileBlobToRow"("B");

-- AddForeignKey
ALTER TABLE "_FileBlobToRow" ADD CONSTRAINT "_FileBlobToRow_A_fkey" FOREIGN KEY ("A") REFERENCES "FileBlob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileBlobToRow" ADD CONSTRAINT "_FileBlobToRow_B_fkey" FOREIGN KEY ("B") REFERENCES "Row"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

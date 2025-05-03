-- CreateEnum
CREATE TYPE "RoleLevel" AS ENUM ('System', 'Organization', 'Project');

-- CreateEnum
CREATE TYPE "EndpointType" AS ENUM ('GRAPHQL', 'REST_API');

-- CreateTable
CREATE TABLE "Instance" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "isEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "emailCode" TEXT NOT NULL DEFAULT '',
    "roleId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "level" "RoleLevel" NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "condition" JSONB,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "createdId" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrganization" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT NOT NULL DEFAULT '',
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "hasChanges" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndpointVersion" (
    "id" TEXT NOT NULL,
    "type" "EndpointType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EndpointVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EndpointType" NOT NULL,
    "revisionId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "versionId" TEXT NOT NULL,
    "createdId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "readonly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "Row" (
    "versionId" TEXT NOT NULL,
    "createdId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "readonly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "hash" TEXT NOT NULL,
    "schemaHash" TEXT NOT NULL,

    CONSTRAINT "Row_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RevisionToTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RevisionToTable_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RowToTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RowToTable_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_createdId_key" ON "Organization"("createdId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrganization_organizationId_userId_key" ON "UserOrganization"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_organizationId_name_key" ON "Project"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserProject_projectId_userId_key" ON "UserProject"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_projectId_key" ON "Branch"("name", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Revision_sequence_key" ON "Revision"("sequence");

-- CreateIndex
CREATE INDEX "Revision_branchId_idx" ON "Revision"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "EndpointVersion_type_version_key" ON "EndpointVersion"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_revisionId_type_key" ON "Endpoint"("revisionId", "type");

-- CreateIndex
CREATE INDEX "Table_id_idx" ON "Table"("id");

-- CreateIndex
CREATE INDEX "Row_data_idx" ON "Row" USING GIN ("data");

-- CreateIndex
CREATE INDEX "Row_id_idx" ON "Row"("id");

-- CreateIndex
CREATE INDEX "Row_hash_idx" ON "Row"("hash");

-- CreateIndex
CREATE INDEX "Row_schemaHash_idx" ON "Row"("schemaHash");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE INDEX "_RevisionToTable_B_index" ON "_RevisionToTable"("B");

-- CreateIndex
CREATE INDEX "_RowToTable_B_index" ON "_RowToTable"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Revision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "EndpointVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "Revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RevisionToTable" ADD CONSTRAINT "_RevisionToTable_A_fkey" FOREIGN KEY ("A") REFERENCES "Revision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RevisionToTable" ADD CONSTRAINT "_RevisionToTable_B_fkey" FOREIGN KEY ("B") REFERENCES "Table"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RowToTable" ADD CONSTRAINT "_RowToTable_A_fkey" FOREIGN KEY ("A") REFERENCES "Row"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RowToTable" ADD CONSTRAINT "_RowToTable_B_fkey" FOREIGN KEY ("B") REFERENCES "Table"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

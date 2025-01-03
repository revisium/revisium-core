-- AlterTable
ALTER TABLE "_PermissionToRole" ADD CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PermissionToRole_AB_unique";

-- AlterTable
ALTER TABLE "_RevisionToTable" ADD CONSTRAINT "_RevisionToTable_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_RevisionToTable_AB_unique";

-- AlterTable
ALTER TABLE "_RowToTable" ADD CONSTRAINT "_RowToTable_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_RowToTable_AB_unique";

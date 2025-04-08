import { makeTypedQueryFactory as $mkFactory } from "@prisma/client/runtime/binary"
export const hasRowDiffsBetweenRevisions = /*#__PURE__*/ $mkFactory("\nSELECT EXISTS (\nWITH\nparent_rows AS (SELECT \"id\", \"createdId\", \"versionId\"\nFROM \"Row\"\nWHERE (\"Row\".\"versionId\") IN (SELECT \"t1\".\"A\"\nFROM \"_RowToTable\" AS \"t1\"\nINNER JOIN \"Table\" AS \"j1\" ON (\"j1\".\"versionId\") = (\"t1\".\"B\")\nWHERE (\"j1\".\"createdId\" = $1 AND\n(\"j1\".\"versionId\") IN (SELECT \"t2\".\"B\"\nFROM \"_RevisionToTable\" AS \"t2\"\nINNER JOIN \"Revision\" AS \"j2\" ON (\"j2\".\"id\") = (\"t2\".\"A\")\nWHERE (\"j2\".\"id\" = $2 AND \"t2\".\"B\" IS NOT NULL)) AND\n\"t1\".\"A\" IS NOT NULL))),\n\nchild_rows AS (SELECT \"id\", \"createdId\", \"versionId\"\nFROM \"Row\"\nWHERE (\"Row\".\"versionId\") IN (SELECT \"t1\".\"A\"\nFROM \"_RowToTable\" AS \"t1\"\nINNER JOIN \"Table\" AS \"j1\" ON (\"j1\".\"versionId\") = (\"t1\".\"B\")\nWHERE (\"j1\".\"createdId\" = $1 AND (\"j1\".\"versionId\") IN (SELECT \"t2\".\"B\"\nFROM \"_RevisionToTable\" AS \"t2\"\nINNER JOIN \"Revision\" AS \"j2\" ON (\"j2\".\"id\") = (\"t2\".\"A\")\nWHERE (\"j2\".\"id\" = $3 AND \"t2\".\"B\" IS NOT NULL)) AND\n\"t1\".\"A\" IS NOT NULL)))\nSELECT 1\nFROM\nchild_rows ct\nFULL OUTER JOIN parent_rows pt USING (\"createdId\")\nWHERE\npt.\"createdId\" IS NULL OR\nct.\"createdId\" IS NULL OR\nct.\"versionId\" != pt.\"versionId\"\n\nLIMIT 1)")

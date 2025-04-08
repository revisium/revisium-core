"use strict"
const { makeTypedQueryFactory: $mkFactory } = require("@prisma/client/runtime/binary")
exports.countTableDiffsBetweenRevisions = /*#__PURE__*/ $mkFactory("\nWITH parent_tables AS (SELECT \"id\", \"createdId\", \"versionId\"\nFROM \"Table\"\nWHERE (\"public\".\"Table\".\"versionId\") IN (SELECT \"t1\".\"B\"\nFROM \"public\".\"_RevisionToTable\" AS \"t1\"\nINNER JOIN \"public\".\"Revision\" AS \"j1\" ON (\"j1\".\"id\") = (\"t1\".\"A\")\nWHERE (\"j1\".\"id\" = $1 AND \"t1\".\"B\" IS NOT NULL))),\nchild_tables AS (SELECT \"id\", \"createdId\", \"versionId\"\nFROM \"Table\"\nWHERE (\"public\".\"Table\".\"versionId\") IN (SELECT \"t1\".\"B\"\nFROM \"public\".\"_RevisionToTable\" AS \"t1\"\nINNER JOIN \"public\".\"Revision\" AS \"j1\" ON (\"j1\".\"id\") = (\"t1\".\"A\")\nWHERE (\"j1\".\"id\" = $2 AND \"t1\".\"B\" IS NOT NULL)))\nSELECT COUNT(*) ::integer AS count\nFROM\nchild_tables ct\nFULL OUTER JOIN parent_tables pt USING (\"createdId\")\nWHERE\npt.\"createdId\" IS NULL\nOR\nct.\"createdId\" IS NULL\nOR\nct.\"versionId\" != pt.\"versionId\"\n")

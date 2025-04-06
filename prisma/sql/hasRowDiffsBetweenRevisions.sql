-- @param {String} $1:tableCreatedId The createdId of the table
-- @param {String} $2:fromRevisionId The id of the revision
-- @param {String} $3:toRevisionId The id of the revision

SELECT EXISTS (
    WITH
    parent_rows AS (SELECT "id", "createdId", "versionId"
                      FROM "Row"
                      WHERE ("public"."Row"."versionId") IN (SELECT "t1"."A" FROM "public"."_RowToTable" AS "t1" INNER JOIN "public"."Table" AS "j1" ON ("j1"."versionId") = ("t1"."B") WHERE ("j1"."createdId" = $1 AND ("j1"."versionId") IN (SELECT "t2"."B" FROM "public"."_RevisionToTable" AS "t2" INNER JOIN "public"."Revision" AS "j2" ON ("j2"."id") = ("t2"."A") WHERE ("j2"."id" = $2 AND "t2"."B" IS NOT NULL)) AND "t1"."A" IS NOT NULL))),

    child_rows AS (SELECT "id", "createdId", "versionId"
                     FROM "Row"
                     WHERE ("public"."Row"."versionId") IN (SELECT "t1"."A" FROM "public"."_RowToTable" AS "t1" INNER JOIN "public"."Table" AS "j1" ON ("j1"."versionId") = ("t1"."B") WHERE ("j1"."createdId" = $1 AND ("j1"."versionId") IN (SELECT "t2"."B" FROM "public"."_RevisionToTable" AS "t2" INNER JOIN "public"."Revision" AS "j2" ON ("j2"."id") = ("t2"."A") WHERE ("j2"."id" = $3 AND "t2"."B" IS NOT NULL)) AND "t1"."A" IS NOT NULL)))
    SELECT 1
    FROM
    child_rows ct
    FULL OUTER JOIN parent_rows pt USING ("createdId")
    WHERE
    pt."createdId" IS NULL OR
    ct."createdId" IS NULL OR
    ct."versionId" != pt."versionId"

LIMIT 1)

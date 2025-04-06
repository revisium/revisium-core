-- @param {String} $1:fromRevisionId The id of the revision
-- @param {String} $2:toRevisionId The id of the revision

WITH parent_tables AS (SELECT "id", "createdId", "versionId"
                       FROM "Table"
                       WHERE ("public"."Table"."versionId") IN (SELECT "t1"."B"
                                                                FROM "public"."_RevisionToTable" AS "t1"
                                                                         INNER JOIN "public"."Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                                WHERE ("j1"."id" = $1 AND "t1"."B" IS NOT NULL))),
     child_tables AS (SELECT "id", "createdId", "versionId"
                      FROM "Table"
                      WHERE ("public"."Table"."versionId") IN (SELECT "t1"."B"
                                                               FROM "public"."_RevisionToTable" AS "t1"
                                                                        INNER JOIN "public"."Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                               WHERE ("j1"."id" = $2 AND "t1"."B" IS NOT NULL)))
SELECT COUNT(*) ::integer AS count
FROM
    child_tables ct
    FULL OUTER JOIN parent_tables pt USING ("createdId")
WHERE
    pt."createdId" IS NULL
   OR
    ct."createdId" IS NULL
   OR
    ct."versionId" != pt."versionId"


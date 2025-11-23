-- @param {String} $1:fromRevisionId The id of the revision
-- @param {String} $2:toRevisionId The id of the revision
-- @param {Int} $3:limit
-- @param {Int} $4:offset
-- @param {Boolean} $5:includeSystem Whether to include system tables (default false)

WITH parent_tables AS (SELECT "id", "createdId", "versionId"
                       FROM "Table"
                       WHERE ("Table"."versionId") IN (SELECT "t1"."B"
                                                       FROM "_RevisionToTable" AS "t1"
                                                                INNER JOIN "Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                       WHERE ("j1"."id" = $1 AND "t1"."B" IS NOT NULL))
                       AND ($5::boolean IS TRUE OR "Table"."system" = FALSE)),
     child_tables AS (SELECT "id", "createdId", "versionId"
                      FROM "Table"
                      WHERE ("Table"."versionId") IN (SELECT "t1"."B"
                                                      FROM "_RevisionToTable" AS "t1"
                                                               INNER JOIN "Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                      WHERE ("j1"."id" = $2 AND "t1"."B" IS NOT NULL))
                      AND ($5::boolean IS TRUE OR "Table"."system" = FALSE))
SELECT pt."id"        AS "fromId",
       pt."createdId" AS "fromCreatedId",
       pt."versionId" AS "fromVersionId",
       ct."id"        AS "toId",
       ct."createdId" AS "toCreatedId",
       ct."versionId" AS "toVersionId",
       CASE
           WHEN pt."createdId" IS NULL THEN 'added'
           WHEN ct."createdId" IS NULL THEN 'removed'
           WHEN pt."id" != ct."id" THEN 'renamed'
           WHEN ct."versionId" != pt."versionId" THEN 'modified'
           END        AS "changeType"
FROM child_tables ct
         FULL OUTER JOIN parent_tables pt USING ("createdId")
WHERE pt."createdId" IS NULL
   OR ct."createdId" IS NULL
   OR pt."id" != ct."id"
   OR ct."versionId" != pt."versionId"

LIMIT $3
OFFSET $4


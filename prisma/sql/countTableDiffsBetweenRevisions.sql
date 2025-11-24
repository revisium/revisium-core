-- @param {String} $1:fromRevisionId The id of the revision
-- @param {String} $2:toRevisionId The id of the revision
-- @param {Json} $3:changeTypes (optional, array of change types to filter, NULL for all)
-- @param {Boolean} $4:includeSystem Whether to include system tables (default false)

WITH parent_tables AS (SELECT "id", "createdId", "versionId"
                       FROM "Table"
                       WHERE ("Table"."versionId") IN (SELECT "t1"."B"
                                                       FROM "_RevisionToTable" AS "t1"
                                                                INNER JOIN "Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                       WHERE ("j1"."id" = $1 AND "t1"."B" IS NOT NULL))
                       AND ($4::boolean IS TRUE OR "Table"."system" = FALSE)),
     child_tables AS (SELECT "id", "createdId", "versionId"
                      FROM "Table"
                      WHERE ("Table"."versionId") IN (SELECT "t1"."B"
                                                      FROM "_RevisionToTable" AS "t1"
                                                               INNER JOIN "Revision" AS "j1" ON ("j1"."id") = ("t1"."A")
                                                      WHERE ("j1"."id" = $2 AND "t1"."B" IS NOT NULL))
                      AND ($4::boolean IS TRUE OR "Table"."system" = FALSE))
SELECT COUNT(*) ::integer AS count
FROM
    child_tables ct
    FULL OUTER JOIN parent_tables pt USING ("createdId")
WHERE
    (pt."createdId" IS NULL
   OR ct."createdId" IS NULL
   OR pt."id" != ct."id"
   OR ct."versionId" != pt."versionId")
   AND ($3::jsonb IS NULL OR LOWER(CASE
           WHEN pt."createdId" IS NULL THEN 'added'
           WHEN ct."createdId" IS NULL THEN 'removed'
           WHEN pt."id" != ct."id" AND ct."versionId" != pt."versionId" THEN 'renamed_and_modified'
           WHEN pt."id" != ct."id" THEN 'renamed'
           WHEN ct."versionId" != pt."versionId" THEN 'modified'
           END) = ANY(ARRAY(SELECT LOWER(jsonb_array_elements_text($3::jsonb)))))


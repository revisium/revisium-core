-- @param {String} $1:fromRevisionId
-- @param {String} $2:toRevisionId
-- @param {String} $3:tableCreatedId (optional, NULL for all tables)
-- @param {Boolean} $4:includeSystem (optional, whether to include system tables, default FALSE)

WITH parent_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."hash",
        r."schemaHash",
        t."createdId" as "tableCreatedId"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $1
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($4::boolean IS TRUE OR t."system" = FALSE)
),
child_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."hash",
        r."schemaHash",
        t."createdId" as "tableCreatedId"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $2
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($4::boolean IS TRUE OR t."system" = FALSE)
)
SELECT
    COUNT(*) AS "total",
    COUNT(*) FILTER (WHERE pr."createdId" IS NULL) AS "added",
    COUNT(*) FILTER (WHERE cr."createdId" IS NULL) AS "removed",
    COUNT(*) FILTER (WHERE pr."id" != cr."id" AND pr."createdId" IS NOT NULL AND cr."createdId" IS NOT NULL) AS "renamed",
    COUNT(*) FILTER (WHERE pr."id" = cr."id" AND cr."hash" != pr."hash") AS "modified",
    COUNT(*) FILTER (WHERE cr."schemaHash" IS NOT NULL AND pr."schemaHash" IS NOT NULL AND cr."schemaHash" != pr."schemaHash") AS "schemaChanges",
    COUNT(*) FILTER (WHERE (cr."schemaHash" IS NULL OR pr."schemaHash" IS NULL OR cr."schemaHash" = pr."schemaHash") AND cr."hash" != pr."hash") AS "dataChanges"
FROM child_rows cr
FULL OUTER JOIN parent_rows pr USING ("createdId")
WHERE
    pr."createdId" IS NULL OR
    cr."createdId" IS NULL OR
    pr."id" != cr."id" OR
    cr."hash" != pr."hash"

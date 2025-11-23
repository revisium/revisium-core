-- @param {String} $1:fromRevisionId
-- @param {String} $2:toRevisionId
-- @param {String} $3:tableCreatedId (optional, NULL для всех таблиц)
-- @param {Boolean} $4:includeSystem (optional, включать ли системные таблицы, по умолчанию FALSE)

WITH parent_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."hash"
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
        r."hash"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $2
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($4::boolean IS TRUE OR t."system" = FALSE)
)
SELECT
    COUNT(*) AS "count"
FROM child_rows cr
FULL OUTER JOIN parent_rows pr USING ("createdId")
WHERE
    pr."createdId" IS NULL OR
    cr."createdId" IS NULL OR
    pr."id" != cr."id" OR
    cr."hash" != pr."hash"

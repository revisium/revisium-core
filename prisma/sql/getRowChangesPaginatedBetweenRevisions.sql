-- @param {String} $1:fromRevisionId
-- @param {String} $2:toRevisionId
-- @param {String} $3:tableCreatedId (optional, for filtering, NULL for all tables)
-- @param {String} $4:searchTerm (optional, for searching by rowId, NULL to disable)
-- @param {Json} $5:changeTypes (optional, array of change types to filter, NULL for all)
-- @param {Int} $6:limit
-- @param {Int} $7:offset
-- @param {Boolean} $8:includeSystem (optional, whether to include system tables, default FALSE)

WITH parent_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."versionId",
        r."data",
        r."hash",
        r."schemaHash",
        r."updatedAt",
        r."publishedAt",
        r."createdAt",
        t."id" as "tableId",
        t."createdId" as "tableCreatedId"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $1
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($8::boolean IS TRUE OR t."system" = FALSE)
),
child_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."versionId",
        r."data",
        r."hash",
        r."schemaHash",
        r."updatedAt",
        r."publishedAt",
        r."createdAt",
        t."id" as "tableId",
        t."createdId" as "tableCreatedId"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $2
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($8::boolean IS TRUE OR t."system" = FALSE)
),
all_changes AS (
    SELECT
        pr."id" AS "fromRowId",
        COALESCE(cr."createdId", pr."createdId") AS "rowCreatedId",
        pr."versionId" AS "fromVersionId",
        pr."data" AS "fromData",
        pr."hash" AS "fromHash",
        pr."schemaHash" AS "fromSchemaHash",
        pr."tableId" AS "fromTableId",
        COALESCE(cr."tableCreatedId", pr."tableCreatedId") AS "tableCreatedId",
        pr."createdAt" AS "fromCreatedAt",

        cr."id" AS "toRowId",
        cr."versionId" AS "toVersionId",
        cr."data" AS "toData",
        cr."hash" AS "toHash",
        cr."schemaHash" AS "toSchemaHash",
        cr."tableId" AS "toTableId",
        COALESCE(cr."updatedAt", pr."updatedAt") AS "updatedAt",
        COALESCE(cr."publishedAt", pr."publishedAt") AS "publishedAt",
        COALESCE(cr."createdAt", pr."createdAt") AS "createdAt",

        CASE
            WHEN pr."createdId" IS NULL THEN 'ADDED'
            WHEN cr."createdId" IS NULL THEN 'REMOVED'
            WHEN pr."id" != cr."id" AND cr."hash" != pr."hash" THEN 'RENAMED_AND_MODIFIED'
            WHEN pr."id" != cr."id" THEN 'RENAMED'
            WHEN cr."hash" != pr."hash" THEN 'MODIFIED'
        END AS "changeType"

    FROM child_rows cr
    FULL OUTER JOIN parent_rows pr USING ("createdId")
    WHERE
        (pr."createdId" IS NULL OR
         cr."createdId" IS NULL OR
         pr."id" != cr."id" OR
         cr."hash" != pr."hash")
)
SELECT * FROM all_changes
WHERE
    -- Search by rowId
    ($4::text IS NULL OR
     "fromRowId" ILIKE '%' || $4 || '%' OR
     "toRowId" ILIKE '%' || $4 || '%')
    -- Filter by changeTypes
    AND ($5::jsonb IS NULL OR (
        "changeType" = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
        OR ("changeType" = 'RENAMED_AND_MODIFIED' AND (
            'RENAMED' = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
            OR 'MODIFIED' = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
        ))
    ))
ORDER BY
    "updatedAt" DESC,
    "rowCreatedId" ASC
LIMIT $6
OFFSET $7

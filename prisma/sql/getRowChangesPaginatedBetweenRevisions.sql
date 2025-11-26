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
        -- Row fields
        r."id" AS "rowId",
        r."createdId" AS "rowCreatedId",
        r."versionId" AS "rowVersionId",
        r."data",
        r."hash",
        r."schemaHash",
        r."readonly",
        r."meta",
        r."createdAt" AS "rowCreatedAt",
        r."updatedAt" AS "rowUpdatedAt",
        r."publishedAt" AS "rowPublishedAt",
        -- Table fields
        t."id" AS "tableId",
        t."createdId" AS "tableCreatedId",
        t."versionId" AS "tableVersionId",
        t."readonly" AS "tableReadonly",
        t."system" AS "tableSystem",
        t."createdAt" AS "tableCreatedAt",
        t."updatedAt" AS "tableUpdatedAt"
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
        -- Row fields
        r."id" AS "rowId",
        r."createdId" AS "rowCreatedId",
        r."versionId" AS "rowVersionId",
        r."data",
        r."hash",
        r."schemaHash",
        r."readonly",
        r."meta",
        r."createdAt" AS "rowCreatedAt",
        r."updatedAt" AS "rowUpdatedAt",
        r."publishedAt" AS "rowPublishedAt",
        -- Table fields
        t."id" AS "tableId",
        t."createdId" AS "tableCreatedId",
        t."versionId" AS "tableVersionId",
        t."readonly" AS "tableReadonly",
        t."system" AS "tableSystem",
        t."createdAt" AS "tableCreatedAt",
        t."updatedAt" AS "tableUpdatedAt"
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
        -- fromRow (all Row fields)
        pr."rowId" AS "fromRowId",
        pr."rowCreatedId" AS "fromRowCreatedId",
        pr."rowVersionId" AS "fromRowVersionId",
        pr."data" AS "fromData",
        pr."hash" AS "fromHash",
        pr."schemaHash" AS "fromSchemaHash",
        pr."readonly" AS "fromReadonly",
        pr."meta" AS "fromMeta",
        pr."rowCreatedAt" AS "fromRowCreatedAt",
        pr."rowUpdatedAt" AS "fromRowUpdatedAt",
        pr."rowPublishedAt" AS "fromRowPublishedAt",

        -- toRow (all Row fields)
        cr."rowId" AS "toRowId",
        cr."rowCreatedId" AS "toRowCreatedId",
        cr."rowVersionId" AS "toRowVersionId",
        cr."data" AS "toData",
        cr."hash" AS "toHash",
        cr."schemaHash" AS "toSchemaHash",
        cr."readonly" AS "toReadonly",
        cr."meta" AS "toMeta",
        cr."rowCreatedAt" AS "toRowCreatedAt",
        cr."rowUpdatedAt" AS "toRowUpdatedAt",
        cr."rowPublishedAt" AS "toRowPublishedAt",

        -- fromTable (all Table fields)
        pr."tableId" AS "fromTableId",
        pr."tableCreatedId" AS "fromTableCreatedId",
        pr."tableVersionId" AS "fromTableVersionId",
        pr."tableReadonly" AS "fromTableReadonly",
        pr."tableSystem" AS "fromTableSystem",
        pr."tableCreatedAt" AS "fromTableCreatedAt",
        pr."tableUpdatedAt" AS "fromTableUpdatedAt",

        -- toTable (all Table fields)
        cr."tableId" AS "toTableId",
        cr."tableCreatedId" AS "toTableCreatedId",
        cr."tableVersionId" AS "toTableVersionId",
        cr."tableReadonly" AS "toTableReadonly",
        cr."tableSystem" AS "toTableSystem",
        cr."tableCreatedAt" AS "toTableCreatedAt",
        cr."tableUpdatedAt" AS "toTableUpdatedAt",

        -- Stable IDs for JOIN/sorting
        COALESCE(cr."rowCreatedId", pr."rowCreatedId") AS "rowCreatedId",
        COALESCE(cr."tableCreatedId", pr."tableCreatedId") AS "tableCreatedId",

        -- Change metadata
        CASE
            WHEN pr."rowCreatedId" IS NULL THEN 'ADDED'
            WHEN cr."rowCreatedId" IS NULL THEN 'REMOVED'
            WHEN pr."rowId" != cr."rowId" AND cr."hash" != pr."hash" THEN 'RENAMED_AND_MODIFIED'
            WHEN pr."rowId" != cr."rowId" THEN 'RENAMED'
            WHEN cr."hash" != pr."hash" THEN 'MODIFIED'
        END AS "changeType"

    FROM child_rows cr
    FULL OUTER JOIN parent_rows pr ON cr."rowCreatedId" = pr."rowCreatedId"
    WHERE
        (pr."rowCreatedId" IS NULL OR
         cr."rowCreatedId" IS NULL OR
         pr."rowId" != cr."rowId" OR
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
    COALESCE("toRowUpdatedAt", "fromRowUpdatedAt") DESC,
    "rowCreatedId" ASC
LIMIT $6
OFFSET $7

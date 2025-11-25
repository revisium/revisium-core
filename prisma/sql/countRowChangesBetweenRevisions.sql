-- @param {String} $1:fromRevisionId
-- @param {String} $2:toRevisionId
-- @param {String} $3:tableCreatedId (optional, NULL for all tables)
-- @param {String} $4:searchTerm (optional, for searching by rowId, NULL to disable)
-- @param {Json} $5:changeTypes (optional, array of change types to filter, NULL for all)
-- @param {Boolean} $6:includeSystem (optional, whether to include system tables, default FALSE)

WITH parent_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."hash",
        r."schemaHash"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $1
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($6::boolean IS TRUE OR t."system" = FALSE)
),
child_rows AS (
    SELECT
        r."id",
        r."createdId",
        r."hash",
        r."schemaHash"
    FROM "Row" r
    INNER JOIN "_RowToTable" rt ON r."versionId" = rt."A"
    INNER JOIN "Table" t ON t."versionId" = rt."B"
    INNER JOIN "_RevisionToTable" revt ON t."versionId" = revt."B"
    WHERE revt."A" = $2
        AND ($3::text IS NULL OR t."createdId" = $3)
        AND ($6::boolean IS TRUE OR t."system" = FALSE)
),
all_changes AS (
    SELECT
        CASE
            WHEN pr."createdId" IS NULL THEN 'ADDED'
            WHEN cr."createdId" IS NULL THEN 'REMOVED'
            WHEN pr."id" != cr."id" AND cr."hash" != pr."hash" THEN 'RENAMED_AND_MODIFIED'
            WHEN pr."id" != cr."id" THEN 'RENAMED'
            WHEN cr."hash" != pr."hash" THEN 'MODIFIED'
        END AS "changeType",
        pr."id" AS "fromRowId",
        cr."id" AS "toRowId"
    FROM child_rows cr
    FULL OUTER JOIN parent_rows pr USING ("createdId")
    WHERE
        (pr."createdId" IS NULL OR
         cr."createdId" IS NULL OR
         pr."id" != cr."id" OR
         cr."hash" != pr."hash")
)
SELECT
    COUNT(*) AS "count"
FROM all_changes
WHERE
    ($4::text IS NULL OR
     "fromRowId" ILIKE '%' || $4 || '%' OR
     "toRowId" ILIKE '%' || $4 || '%')
    AND ($5::jsonb IS NULL OR (
        "changeType" = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
        OR ("changeType" = 'RENAMED_AND_MODIFIED' AND (
            'RENAMED' = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
            OR 'MODIFIED' = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb)))
        ))
    ))

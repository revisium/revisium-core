-- @param {String} $1:fromRevisionId
-- @param {String} $2:toRevisionId
-- @param {String} $3:tableCreatedId (optional, NULL for all tables)
-- @param {String} $4:searchTerm (optional, for searching by rowId, NULL to disable)
-- @param {Json} $5:changeTypes (optional, array of change types to filter, NULL for all)
-- @param {Json} $6:changeSources (optional, array of change sources to filter, NULL for all)
-- @param {Boolean} $7:includeSystem (optional, whether to include system tables, default FALSE)

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
        AND ($7::boolean IS TRUE OR t."system" = FALSE)
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
        AND ($7::boolean IS TRUE OR t."system" = FALSE)
),
all_changes AS (
    SELECT
        CASE
            WHEN pr."createdId" IS NULL THEN 'ADDED'
            WHEN cr."createdId" IS NULL THEN 'REMOVED'
            WHEN pr."id" != cr."id" THEN 'RENAMED'
            WHEN cr."hash" != pr."hash" THEN 'MODIFIED'
        END AS "changeType",
        CASE
            WHEN pr."hash" IS NULL OR cr."hash" IS NULL THEN 'DATA'
            WHEN cr."hash" != pr."hash" THEN 'SCHEMA'
            ELSE 'DATA'
        END AS "changeSource",
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
    AND ($5::jsonb IS NULL OR "changeType" = ANY(ARRAY(SELECT jsonb_array_elements_text($5::jsonb))))
    AND ($6::jsonb IS NULL OR "changeSource" = ANY(ARRAY(SELECT jsonb_array_elements_text($6::jsonb))))

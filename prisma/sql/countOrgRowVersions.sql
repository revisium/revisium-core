-- @param {String} $1:organizationId

SELECT COUNT(DISTINCT r."versionId") AS "count"
FROM "Row" r
JOIN "_RowToTable" rt ON rt."A" = r."versionId"
JOIN "Table" t ON t."versionId" = rt."B"
JOIN "_RevisionToTable" rvt ON rvt."B" = t."versionId"
JOIN "Revision" rv ON rv."id" = rvt."A"
JOIN "Branch" b ON b."id" = rv."branchId"
JOIN "Project" p ON p."id" = b."projectId"
WHERE p."organizationId" = $1
  AND p."isDeleted" = false

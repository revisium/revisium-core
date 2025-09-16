export const ROW_CACHE_KEYS = {
  ROW: (revisionId: string, tableId: string, rowId: string) =>
    `revision:${revisionId}:${tableId}:${rowId}`,

  GET_ROWS_PREFIX: (revisionId: string, tableId: string) =>
    `revision:get-rows:${revisionId}:${tableId}`,
} as const;

export const ROW_CACHE_TAGS = {
  REVISION_RELATIVES: (revisionId: string) =>
    `revision-relatives-${revisionId}`,

  TABLE_RELATIVES: (revisionId: string, tableId: string) =>
    `table-relatives-${revisionId}-${tableId}`,

  TABLE_GET_ROWS: (revisionId: string, tableId: string) =>
    `table-get-rows-${revisionId}-${tableId}`,
} as const;

export const ROW_CACHE_CONFIG = {
  TTL: '1d' as const,
  KEY_VERSION: 1 as const,
} as const;

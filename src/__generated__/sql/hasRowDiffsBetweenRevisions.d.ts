import * as $runtime from "@prisma/client/runtime/binary"

/**
 * @param tableCreatedId The createdId of the table
 * @param fromRevisionId The id of the revision
 * @param toRevisionId The id of the revision
 */
export const hasRowDiffsBetweenRevisions: (tableCreatedId: string, fromRevisionId: string, toRevisionId: string) => $runtime.TypedSql<hasRowDiffsBetweenRevisions.Parameters, hasRowDiffsBetweenRevisions.Result>

export namespace hasRowDiffsBetweenRevisions {
  export type Parameters = [tableCreatedId: string, fromRevisionId: string, toRevisionId: string]
  export type Result = {
    exists: boolean | null
  }
}

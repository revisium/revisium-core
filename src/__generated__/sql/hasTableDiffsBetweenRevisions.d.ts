import * as $runtime from "@prisma/client/runtime/binary"

/**
 * @param fromRevisionId The id of the revision
 * @param toRevisionId The id of the revision
 */
export const hasTableDiffsBetweenRevisions: (fromRevisionId: string, toRevisionId: string) => $runtime.TypedSql<hasTableDiffsBetweenRevisions.Parameters, hasTableDiffsBetweenRevisions.Result>

export namespace hasTableDiffsBetweenRevisions {
  export type Parameters = [fromRevisionId: string, toRevisionId: string]
  export type Result = {
    exists: boolean | null
  }
}

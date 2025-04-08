import * as $runtime from "@prisma/client/runtime/binary"

/**
 * @param fromRevisionId The id of the revision
 * @param toRevisionId The id of the revision
 */
export const countTableDiffsBetweenRevisions: (fromRevisionId: string, toRevisionId: string) => $runtime.TypedSql<countTableDiffsBetweenRevisions.Parameters, countTableDiffsBetweenRevisions.Result>

export namespace countTableDiffsBetweenRevisions {
  export type Parameters = [fromRevisionId: string, toRevisionId: string]
  export type Result = {
    count: number | null
  }
}

import * as $runtime from "@prisma/client/runtime/binary"

/**
 * @param fromRevisionId The id of the revision
 * @param toRevisionId The id of the revision
 * @param limit
 * @param offset
 */
export const getTableDiffsPaginatedBetweenRevisions: (fromRevisionId: string, toRevisionId: string, limit: number, offset: number) => $runtime.TypedSql<getTableDiffsPaginatedBetweenRevisions.Parameters, getTableDiffsPaginatedBetweenRevisions.Result>

export namespace getTableDiffsPaginatedBetweenRevisions {
  export type Parameters = [fromRevisionId: string, toRevisionId: string, limit: number, offset: number]
  export type Result = {
    fromId: string
    fromCreatedId: string
    fromVersionId: string
    toId: string
    toCreatedId: string
    toVersionId: string
    changeType: string | null
  }
}

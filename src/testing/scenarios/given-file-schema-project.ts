import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { EngineApiService } from '@revisium/engine';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { getObjectSchema, getRefSchema } from '@revisium/schema-toolkit/mocks';
import {
  prepareData,
  type PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { makeEmptyFileData } from 'src/testing/factories/make-file-data';

export interface FileSchemaProjectScenario extends PrepareDataReturnType {
  fileTableId: string;
  fileRowId: string;
}

export interface GivenFileSchemaProjectOptions {
  /** Flip the project to `isPublic: true` after seeding. */
  isPublic?: boolean;
  /**
   * Commit the draft after seeding. Produces a state where the file-schema
   * table + row span two revisions (committed head + forked new draft) —
   * useful for dedup / multi-version tests.
   */
  commit?: boolean;
}

/**
 * Seeds a private project with a file-schema table (`{ file: $ref: File }`)
 * containing a single row. Uses the engine's public CQRS API for all
 * domain writes, so the setup exercises the same code paths production
 * does — no hand-rolled `prismaService.table.create` / row-version wiring.
 *
 * Returns a superset of `PrepareDataReturnType` with the extra
 * `fileTableId` and `fileRowId` fields that tests need. Note that
 * `PrepareDataReturnType.project` does not expose `isPublic`; the
 * `options.isPublic` flag persists the change via Prisma but is not
 * echoed back on the fixture object — consumers reading visibility
 * should re-query the DB if they need to verify.
 */
export async function givenFileSchemaProject(
  app: INestApplication,
  options: GivenFileSchemaProjectOptions = {},
): Promise<FileSchemaProjectScenario> {
  const engine = app.get(EngineApiService);
  const prisma = app.get(PrismaService);

  const base = await prepareData(app);

  const fileSchema = getObjectSchema({
    file: getRefSchema(SystemSchemaIds.File),
  });
  const fileTableId = `file-table-${nanoid()}`;
  const fileRowId = `file-row-${nanoid()}`;

  await engine.createTable({
    revisionId: base.project.draftRevisionId,
    tableId: fileTableId,
    schema: fileSchema,
  });

  // File fields must be schema defaults on creation; the FilePlugin then
  // populates `status=ready` + `fileId=<nanoid>` in its afterCreateRow hook.
  await engine.createRow({
    revisionId: base.project.draftRevisionId,
    tableId: fileTableId,
    rowId: fileRowId,
    data: { file: { ...makeEmptyFileData() } },
  });

  let draftRevisionId = base.project.draftRevisionId;
  let headRevisionId = base.project.headRevisionId;

  if (options.commit) {
    await engine.createRevision({
      projectId: base.project.projectId,
      branchName: base.project.branchName,
    });
    // After commit, a fresh draft is forked from the just-committed head.
    // Engine's createRevision return value doesn't expose it directly; the
    // authoritative state lives on the Revision table via isHead / isDraft.
    const [newHead, newDraft] = await Promise.all([
      prisma.revision.findFirstOrThrow({
        where: { branchId: base.project.branchId, isHead: true },
      }),
      prisma.revision.findFirstOrThrow({
        where: { branchId: base.project.branchId, isDraft: true },
      }),
    ]);
    headRevisionId = newHead.id;
    draftRevisionId = newDraft.id;
  }

  if (options.isPublic) {
    await prisma.project.update({
      where: { id: base.project.projectId },
      data: { isPublic: true },
    });
  }

  return {
    ...base,
    project: {
      ...base.project,
      draftRevisionId,
      headRevisionId,
    },
    fileTableId,
    fileRowId,
  };
}

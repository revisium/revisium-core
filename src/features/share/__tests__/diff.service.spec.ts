import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import {
  DiffService,
  TableDiffChangeType,
} from 'src/features/share/diff.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('DiffService', () => {
  describe('diffTables', () => {
    it('modified table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const fromTable = await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: {
              id: fromRevision.id,
            },
          },
        },
      });

      const toTable = await prismaService.table.create({
        data: {
          id: fromTable.id,
          createdId: fromTable.createdId,
          versionId: nanoid(),
          revisions: {
            connect: {
              id: toRevision.id,
            },
          },
        },
      });

      const result = await diffService.tableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result.length).toEqual(1);
      expect(result[0]).toEqual({
        id: fromTable.id,
        createdId: fromTable.createdId,
        fromVersionId: fromTable.versionId,
        toVersionId: toTable.versionId,
        changeType: TableDiffChangeType.Modified,
      });
    });

    it('added table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const addedTable = await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: {
              id: toRevision.id,
            },
          },
        },
      });

      const result = await diffService.tableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result.length).toEqual(1);
      expect(result[0]).toEqual({
        id: addedTable.id,
        createdId: addedTable.createdId,
        fromVersionId: null,
        toVersionId: addedTable.versionId,
        changeType: TableDiffChangeType.Added,
      });
    });

    it('removed table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const removedTable = await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: {
              id: fromRevision.id,
            },
          },
        },
      });

      const result = await diffService.tableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result.length).toEqual(1);
      expect(result[0]).toEqual({
        id: removedTable.id,
        createdId: removedTable.createdId,
        fromVersionId: removedTable.versionId,
        toVersionId: null,
        changeType: TableDiffChangeType.Removed,
      });
    });

    it('not touched table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: [
              {
                id: fromRevision.id,
              },
              {
                id: toRevision.id,
              },
            ],
          },
        },
      });

      const result = await diffService.tableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result.length).toEqual(0);
    });

    it('complex', async () => {
      const {
        fromRevision,
        toRevision,
        fromModifiedTable,
        toModifiedTable,
        addedTable,
        removedTable,
      } = await prepareComplexDiffs();

      const result = await diffService.tableDiffs(
        fromRevision.id,
        toRevision.id,
        100,
      );

      expect(result.length).toEqual(3);
      expect(
        result.find((diff) => diff.changeType === TableDiffChangeType.Modified),
      ).toEqual({
        id: fromModifiedTable.id,
        createdId: fromModifiedTable.createdId,
        fromVersionId: fromModifiedTable.versionId,
        toVersionId: toModifiedTable.versionId,
        changeType: TableDiffChangeType.Modified,
      });

      expect(
        result.find((diff) => diff.changeType === TableDiffChangeType.Added),
      ).toEqual({
        id: addedTable.id,
        createdId: addedTable.createdId,
        fromVersionId: null,
        toVersionId: addedTable.versionId,
        changeType: TableDiffChangeType.Added,
      });

      expect(
        result.find((diff) => diff.changeType === TableDiffChangeType.Removed),
      ).toEqual({
        id: removedTable.id,
        createdId: removedTable.createdId,
        fromVersionId: removedTable.versionId,
        toVersionId: null,
        changeType: TableDiffChangeType.Removed,
      });
    });

    xit('pagination tests', () => {});

    xit('sort order tests', () => {});
  });

  describe('hasTableDiffs', () => {
    it('has diffs', async () => {
      const { fromRevision, toRevision } = await prepareComplexDiffs();

      const result = await diffService.hasTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(true);
    });

    it('empty revision', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const result = await diffService.hasTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(false);
    });

    it('modified table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const fromTable = await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: {
              id: fromRevision.id,
            },
          },
        },
      });

      await prismaService.table.create({
        data: {
          id: fromTable.id,
          createdId: fromTable.createdId,
          versionId: nanoid(),
          revisions: {
            connect: {
              id: toRevision.id,
            },
          },
        },
      });

      const result = await diffService.hasTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(true);
    });
  });

  describe('countTableDiffs', () => {
    it('complex', async () => {
      const { fromRevision, toRevision } = await prepareComplexDiffs();

      const result = await diffService.countTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(3);
    });

    it('empty revision', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const result = await diffService.countTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(0);
    });

    it('modified table', async () => {
      const { fromRevision, toRevision } = await prepareRevisions();

      const fromTable = await prismaService.table.create({
        data: {
          id: nanoid(),
          createdId: nanoid(),
          versionId: nanoid(),
          revisions: {
            connect: {
              id: fromRevision.id,
            },
          },
        },
      });

      await prismaService.table.create({
        data: {
          id: fromTable.id,
          createdId: fromTable.createdId,
          versionId: nanoid(),
          revisions: {
            connect: {
              id: toRevision.id,
            },
          },
        },
      });

      const result = await diffService.countTableDiffs(
        fromRevision.id,
        toRevision.id,
      );

      expect(result).toEqual(1);
    });
  });

  let prismaService: PrismaService;
  let diffService: DiffService;

  async function prepareComplexDiffs() {
    const { fromRevision, toRevision } = await prepareRevisions();

    // not modified
    const notModifiedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: [
            {
              id: fromRevision.id,
            },
            {
              id: toRevision.id,
            },
          ],
        },
      },
    });

    const fromModifiedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: fromRevision.id,
          },
        },
      },
    });

    const toModifiedTable = await prismaService.table.create({
      data: {
        id: fromModifiedTable.id,
        createdId: fromModifiedTable.createdId,
        versionId: nanoid(),
        revisions: {
          connect: {
            id: toRevision.id,
          },
        },
      },
    });

    const removedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: fromRevision.id,
          },
        },
      },
    });

    const addedTable = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: toRevision.id,
          },
        },
      },
    });

    return {
      fromRevision,
      toRevision,
      notModifiedTable,
      fromModifiedTable,
      toModifiedTable,
      addedTable,
      removedTable,
    };
  }

  async function prepareRevisions() {
    const branch = await prismaService.branch.create({
      data: {
        id: nanoid(),
        name: nanoid(),
        project: {
          create: {
            id: nanoid(),
            name: nanoid(),
            organization: {
              create: {
                id: nanoid(),
              },
            },
          },
        },
      },
    });

    const fromRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const toRevision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    return {
      fromRevision,
      toRevision,
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [DiffService],
    }).compile();

    diffService = module.get(DiffService);
    prismaService = module.get(PrismaService);
  });
});

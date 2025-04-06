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
  });

  let prismaService: PrismaService;
  let diffService: DiffService;

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

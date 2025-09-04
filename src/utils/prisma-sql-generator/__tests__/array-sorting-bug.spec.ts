import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { WhereGeneratorPrisma } from '../where-generator.prisma';
import { runViaPrismaRaw } from './shared-helpers';
import { nanoid } from 'nanoid';

describe('Array Sorting Bug Test', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let generator: WhereGeneratorPrisma;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    prismaService = module.get(PrismaService);
    generator = new WhereGeneratorPrisma();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should sort by array max aggregation correctly (user bug report)', async () => {
    // Create test project structure first
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
                createdId: nanoid(),
              },
            },
          },
        },
      },
    });

    const revision = await prismaService.revision.create({
      data: {
        id: nanoid(),
        branch: {
          connect: {
            id: branch.id,
          },
        },
      },
    });

    const table = await prismaService.table.create({
      data: {
        id: nanoid(),
        createdId: nanoid(),
        versionId: nanoid(),
        revisions: {
          connect: {
            id: revision.id,
          },
        },
      },
    });

    // Create the test data structure
    const testRows = [
      {
        id: 'test-row-1',
        data: { prices: [8, 9] }, // max = 9
        expectedOrder: 2, // Should be 2nd in DESC order (12, 9, 3)
      },
      {
        id: 'test-row-2',
        data: { prices: [5, 6, 7, 12] }, // max = 12
        expectedOrder: 1, // Should be 1st in DESC order (12, 9, 3)
      },
      {
        id: 'test-row-3',
        data: { prices: [1, 3] }, // max = 3
        expectedOrder: 3, // Should be 3rd in DESC order (12, 9, 3)
      },
    ];

    // Create rows in database
    for (const rowData of testRows) {
      await prismaService.row.create({
        data: {
          id: rowData.id,
          createdId: nanoid(),
          versionId: nanoid(),
          readonly: false,
          data: rowData.data,
          meta: {},
          hash: nanoid(),
          schemaHash: nanoid(),
          tables: {
            connect: { versionId: table.versionId },
          },
        },
      });
    }

    // Test sorting by max price DESC
    const options = {
      take: 10,
      skip: 0,
      orderBy: {
        data: {
          path: '$.prices[*]',
          direction: 'desc' as const,
          type: 'int' as const,
          aggregation: 'max' as const,
        },
      },
      where: {},
    };

    const query = generator.generateGetRowsQueryPrisma(
      table.versionId,
      options,
    );
    const result = await runViaPrismaRaw(prismaService, query);

    console.log('\n=== Actual Results ===');
    result.forEach((row: any, index: number) => {
      const data = row.data; // Already parsed by Prisma
      const maxPrice = Math.max(...data.prices);
      console.log(
        `${index + 1}. ${row.id}: prices=${JSON.stringify(data.prices)}, max=${maxPrice}`,
      );
    });

    // Extract the actual order of IDs
    const actualOrder = result.map((row: any) => row.id);

    // Expected order by max DESC: test-row-2 (max=12), test-row-1 (max=9), test-row-3 (max=3)
    const expectedOrder = ['test-row-2', 'test-row-1', 'test-row-3'];

    console.log('\n=== Expected vs Actual ===');
    console.log('Expected:', expectedOrder);
    console.log('Actual:  ', actualOrder);

    // This test should FAIL initially due to the bug
    expect(actualOrder).toEqual(expectedOrder);

    // Also verify max values are correctly calculated
    const maxValues = result.map((row: any) => {
      const data = row.data; // Already parsed by Prisma
      return Math.max(...data.prices);
    });

    // Should be [12, 9, 3] in DESC order
    expect(maxValues).toEqual([12, 9, 3]);

    // Clean up - rows will be cleaned up automatically due to cascade deletes
  });
});

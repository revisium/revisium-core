import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('GetTableSchemaHandler', () => {
  describe('system tables', () => {
    it('should return schema for system table without row in revisium_schema_table', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      const result = await shareTransactionalQueries.getTableSchema(
        draftRevisionId,
        SystemTables.Schema,
      );

      expect(result.schema).toEqual(metaSchema);
    });
  });

  let prismaService: PrismaService;
  let shareTransactionalQueries: ShareTransactionalQueries;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    shareTransactionalQueries = result.shareTransactionalQueries;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});

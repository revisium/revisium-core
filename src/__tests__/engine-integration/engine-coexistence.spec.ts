/**
 * This test proves that @revisium/engine's EngineApiService works
 * alongside core's existing modules, using core's PrismaClient.
 *
 * No core source code is changed — this is purely additive.
 * All existing tests continue to pass.
 */
import { TestingModule, Test } from '@nestjs/testing';
import { EngineModule, EngineApiService } from '@revisium/engine';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { prepareProject } from 'src/__tests__/utils/prepareProject';

describe('Engine coexistence with Core', () => {
  let module: TestingModule;
  let engine: EngineApiService;
  let prisma: PrismaService;
  let projectId: string;
  let branchName: string;
  let draftRevisionId: string;
  let branchId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EngineModule.forRoot({}), DatabaseModule],
    }).compile();

    await module.init();

    engine = module.get(EngineApiService);
    prisma = module.get(PrismaService);

    const project = await prepareProject(prisma);
    projectId = project.projectId;
    branchId = project.branchId;
    branchName = project.branchName;
    draftRevisionId = project.draftRevisionId;
  });

  afterAll(async () => {
    await module?.close();
  });

  it('should create a table via engine', async () => {
    const result = await engine.createTable({
      revisionId: draftRevisionId,
      tableId: 'engine-test-table',
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', default: '' },
        },
        additionalProperties: false,
      },
    });

    expect(result.table?.id).toBe('engine-test-table');
  });

  it('should create a row via engine', async () => {
    const result = await engine.createRow({
      revisionId: draftRevisionId,
      tableId: 'engine-test-table',
      rowId: 'row-1',
      data: { name: 'Hello from engine' },
    });

    expect(result.row?.id).toBe('row-1');
  });

  it('should query rows via engine', async () => {
    const result = await engine.getRows({
      revisionId: draftRevisionId,
      tableId: 'engine-test-table',
      first: 10,
    });

    expect(result.edges.length).toBe(1);
  });

  it('should commit via engine', async () => {
    const result = await engine.createRevision({
      projectId,
      branchName,
      comment: 'Engine integration test commit',
    });

    expect(result).toBeDefined();
  });

  it('should show no changes after commit', async () => {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { revisions: { where: { isDraft: true } } },
    });

    expect(branch?.revisions).toHaveLength(1);
    const newDraftId = branch!.revisions[0].id;

    const changes = await engine.revisionChanges({
      revisionId: newDraftId,
    });

    expect(changes.totalChanges).toBe(0);
  });
});

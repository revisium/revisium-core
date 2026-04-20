import { TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { FileUsageAdminService } from 'src/api/graphql-api/file-usage/file-usage-admin.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';

describe('FileUsageAdminService', () => {
  let module: TestingModule;
  let service: FileUsageAdminService;
  let prisma: PrismaService;
  let closeModule: () => Promise<void>;

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    module = kit.module;
    prisma = kit.prismaService;
    service = module.get(FileUsageAdminService);
    closeModule = kit.close;
  });

  afterAll(async () => {
    await closeModule();
  });

  async function givenProjectWithCounter(fileBytes: bigint): Promise<string> {
    const projectId = `proj-${nanoid()}`;
    await prisma.projectFileUsage.create({
      data: { projectId, fileBytes },
    });
    return projectId;
  }

  describe('validate', () => {
    it('returns a zero-drift report for a project whose counter matches SUM(FileBlob)', async () => {
      const projectId = await givenProjectWithCounter(0n);

      const report = await service.validate(projectId);

      expect(report.projectId).toBe(projectId);
      expect(report.currentFileBytes).toBe('0');
      expect(report.expectedFileBytes).toBe('0');
      expect(report.drift).toBe('0');
      expect(report.fileBlobCount).toBe(0);
      expect(report.referenceCount).toBe(0);
    });

    it('reports drift when the counter diverges from SUM(FileBlob)', async () => {
      const projectId = await givenProjectWithCounter(5_000n);

      const report = await service.validate(projectId);

      expect(report.currentFileBytes).toBe('5000');
      expect(report.expectedFileBytes).toBe('0');
      expect(report.drift).toBe('-5000');
    });
  });

  describe('restore', () => {
    it('dryRun=true maps validate output into the restore shape without writing', async () => {
      const projectId = await givenProjectWithCounter(7_000n);

      const result = await service.restore(projectId, true);

      expect(result.projectId).toBe(projectId);
      expect(result.previousFileBytes).toBe('7000');
      expect(result.nextFileBytes).toBe('0');
      expect(result.drift).toBe('-7000');
      expect(result.dryRun).toBe(true);

      const persisted = await prisma.projectFileUsage.findUnique({
        where: { projectId },
      });
      expect(persisted?.fileBytes).toBe(7_000n);
    });

    it('dryRun=false calls engine.restoreProjectFileBytes and realigns the counter', async () => {
      const projectId = await givenProjectWithCounter(9_000n);

      const result = await service.restore(projectId, false);

      expect(result.projectId).toBe(projectId);
      expect(result.previousFileBytes).toBe('9000');
      expect(result.nextFileBytes).toBe('0');
      expect(result.drift).toBe('-9000');
      expect(result.dryRun).toBe(false);

      const persisted = await prisma.projectFileUsage.findUnique({
        where: { projectId },
      });
      expect(persisted?.fileBytes).toBe(0n);
    });
  });
});

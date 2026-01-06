import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { loadSnapshot, resetSnapshotLoadedState } from '../loader';
import { tableByIdManifest } from '../manifests';

describe('Snapshot fixtures', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    resetSnapshotLoadedState();
    await loadSnapshot();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should load owner user', async () => {
    const user = await prisma.user.findUnique({
      where: { id: tableByIdManifest.owner.userId },
    });
    expect(user).not.toBeNull();
    expect(user?.username).toBe(tableByIdManifest.owner.username);
  });

  it('should load owner project', async () => {
    const project = await prisma.project.findUnique({
      where: { id: tableByIdManifest.project.projectId },
    });
    expect(project).not.toBeNull();
    expect(project?.name).toBe(tableByIdManifest.project.projectName);
    expect(project?.isPublic).toBe(false);
  });

  it('should load public project', async () => {
    const project = await prisma.project.findUnique({
      where: { id: tableByIdManifest.publicProject.projectId },
    });
    expect(project).not.toBeNull();
    expect(project?.isPublic).toBe(true);
  });

  it('should load table', async () => {
    const table = await prisma.table.findUnique({
      where: { versionId: tableByIdManifest.table.headVersionId },
    });
    expect(table).not.toBeNull();
    expect(table?.id).toBe(tableByIdManifest.table.tableId);
  });

  it('should load row', async () => {
    const row = await prisma.row.findUnique({
      where: { versionId: tableByIdManifest.row.headVersionId },
    });
    expect(row).not.toBeNull();
    expect(row?.id).toBe(tableByIdManifest.row.rowId);
  });

  it('should load another owner', async () => {
    const user = await prisma.user.findUnique({
      where: { id: tableByIdManifest.anotherOwner.userId },
    });
    expect(user).not.toBeNull();
    expect(user?.username).toBe(tableByIdManifest.anotherOwner.username);
  });

  it('should load write test rows', async () => {
    const updateRow = await prisma.row.findUnique({
      where: { versionId: tableByIdManifest.writeTests.updateRow.headVersionId },
    });
    expect(updateRow).not.toBeNull();

    const deleteRow = await prisma.row.findUnique({
      where: { versionId: tableByIdManifest.writeTests.deleteRow.headVersionId },
    });
    expect(deleteRow).not.toBeNull();
  });

  describe('write test projects', () => {
    it('should load writeCreateRows project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeCreateRows.projectId },
      });
      expect(project).not.toBeNull();
      expect(project?.name).toBe(tableByIdManifest.writeCreateRows.projectName);
    });

    it('should load writeDeleteTable project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeDeleteTable.projectId },
      });
      expect(project).not.toBeNull();
    });

    it('should load writeUpdateTable project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeUpdateTable.projectId },
      });
      expect(project).not.toBeNull();
    });

    it('should load writeRenameTable project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeRenameTable.projectId },
      });
      expect(project).not.toBeNull();
    });

    it('should load writeDeleteRows project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeDeleteRows.projectId },
      });
      expect(project).not.toBeNull();
    });

    it('should load writeUpdateRows project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writeUpdateRows.projectId },
      });
      expect(project).not.toBeNull();
    });

    it('should load writePatchRows project', async () => {
      const project = await prisma.project.findUnique({
        where: { id: tableByIdManifest.writePatchRows.projectId },
      });
      expect(project).not.toBeNull();
    });
  });
});

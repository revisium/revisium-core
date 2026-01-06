import { INestApplication } from '@nestjs/common';
import hash from 'object-hash';
import { tableByIdManifest } from '../manifests/table-by-id.manifest';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { testSchema } from 'src/features/draft/commands/handlers/__tests__/utils';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { JsonPatchAdd, InitMigration } from '@revisium/schema-toolkit/types';
import { hashedPassword } from '../../utils/prepareProject';

const m = tableByIdManifest;

export async function seedTableById(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  await seedOwner(prisma);
  await seedAnotherOwner(prisma);
  await seedOwnerProject(prisma);
  await seedAnotherProject(prisma);
  await seedPublicProject(prisma);
  await seedWriteProjects(prisma);
}

async function seedOwner(prisma: PrismaService): Promise<void> {
  await prisma.organization.upsert({
    where: { id: m.owner.organizationId },
    create: {
      id: m.owner.organizationId,
      createdId: `created-${m.owner.organizationId}`,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: m.owner.userId },
    create: {
      id: m.owner.userId,
      username: m.owner.username,
      roleId: 'systemUser',
      password: hashedPassword,
      isEmailConfirmed: true,
    },
    update: {
      username: m.owner.username,
      password: hashedPassword,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      id: `uo-${m.owner.userId}`,
    },
    create: {
      id: `uo-${m.owner.userId}`,
      userId: m.owner.userId,
      organizationId: m.owner.organizationId,
      roleId: 'organizationOwner',
    },
    update: {},
  });
}

async function seedAnotherOwner(prisma: PrismaService): Promise<void> {
  await prisma.organization.upsert({
    where: { id: m.anotherOwner.organizationId },
    create: {
      id: m.anotherOwner.organizationId,
      createdId: `created-${m.anotherOwner.organizationId}`,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: m.anotherOwner.userId },
    create: {
      id: m.anotherOwner.userId,
      username: m.anotherOwner.username,
      roleId: 'systemUser',
      password: hashedPassword,
      isEmailConfirmed: true,
    },
    update: {
      username: m.anotherOwner.username,
      password: hashedPassword,
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      id: `uo-${m.anotherOwner.userId}`,
    },
    create: {
      id: `uo-${m.anotherOwner.userId}`,
      userId: m.anotherOwner.userId,
      organizationId: m.anotherOwner.organizationId,
      roleId: 'organizationOwner',
    },
    update: {},
  });
}

async function seedOwnerProject(prisma: PrismaService): Promise<void> {
  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: m.project.projectId,
    projectName: m.project.projectName,
    branchId: m.project.branchId,
    branchName: m.project.branchName,
    headRevisionId: m.project.headRevisionId,
    draftRevisionId: m.project.draftRevisionId,
    schemaVersionId: m.systemTables.schemaVersionId,
    migrationVersionId: m.systemTables.migrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: m.project.headRevisionId,
    draftRevisionId: m.project.draftRevisionId,
    tableId: m.table.tableId,
    headVersionId: m.table.headVersionId,
    draftVersionId: m.table.draftVersionId,
    schemaRowVersionId: m.table.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.schemaVersionId,
    migrationTableVersionId: m.systemTables.migrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: m.table.headVersionId,
    tableDraftVersionId: m.table.draftVersionId,
    rowId: m.row.rowId,
    headVersionId: m.row.headVersionId,
    draftVersionId: m.row.draftVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: m.table.headVersionId,
    tableDraftVersionId: m.table.draftVersionId,
    rowId: m.writeTests.updateRow.rowId,
    headVersionId: m.writeTests.updateRow.headVersionId,
    draftVersionId: m.writeTests.updateRow.draftVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: m.table.headVersionId,
    tableDraftVersionId: m.table.draftVersionId,
    rowId: m.writeTests.deleteRow.rowId,
    headVersionId: m.writeTests.deleteRow.headVersionId,
    draftVersionId: m.writeTests.deleteRow.draftVersionId,
  });
}

async function seedAnotherProject(prisma: PrismaService): Promise<void> {
  await upsertProject(prisma, {
    organizationId: m.anotherOwner.organizationId,
    projectId: m.anotherProject.projectId,
    projectName: m.anotherProject.projectName,
    branchId: m.anotherProject.branchId,
    branchName: m.anotherProject.branchName,
    headRevisionId: m.anotherProject.headRevisionId,
    draftRevisionId: m.anotherProject.draftRevisionId,
    schemaVersionId: m.systemTables.anotherSchemaVersionId,
    migrationVersionId: m.systemTables.anotherMigrationVersionId,
    isPublic: false,
  });
}

async function seedPublicProject(prisma: PrismaService): Promise<void> {
  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: m.publicProject.projectId,
    projectName: m.publicProject.projectName,
    branchId: m.publicProject.branchId,
    branchName: m.publicProject.branchName,
    headRevisionId: m.publicProject.headRevisionId,
    draftRevisionId: m.publicProject.draftRevisionId,
    schemaVersionId: m.systemTables.publicSchemaVersionId,
    migrationVersionId: m.systemTables.publicMigrationVersionId,
    isPublic: true,
  });

  await upsertTable(prisma, {
    headRevisionId: m.publicProject.headRevisionId,
    draftRevisionId: m.publicProject.draftRevisionId,
    tableId: m.publicTable.tableId,
    headVersionId: m.publicTable.headVersionId,
    draftVersionId: m.publicTable.draftVersionId,
    schemaRowVersionId: m.publicTable.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.publicSchemaVersionId,
    migrationTableVersionId: m.systemTables.publicMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: m.publicTable.headVersionId,
    tableDraftVersionId: m.publicTable.draftVersionId,
    rowId: m.publicRow.rowId,
    headVersionId: m.publicRow.headVersionId,
    draftVersionId: m.publicRow.draftVersionId,
  });
}

async function upsertProject(
  prisma: PrismaService,
  params: {
    organizationId: string;
    projectId: string;
    projectName: string;
    branchId: string;
    branchName: string;
    headRevisionId: string;
    draftRevisionId: string;
    schemaVersionId: string;
    migrationVersionId: string;
    isPublic: boolean;
  },
): Promise<void> {
  const {
    organizationId,
    projectId,
    projectName,
    branchId,
    branchName,
    headRevisionId,
    draftRevisionId,
    schemaVersionId,
    migrationVersionId,
    isPublic,
  } = params;

  await prisma.project.upsert({
    where: { id: projectId },
    create: {
      id: projectId,
      name: projectName,
      organizationId,
      isPublic,
    },
    update: {
      name: projectName,
      isPublic,
    },
  });

  await prisma.branch.upsert({
    where: { id: branchId },
    create: {
      id: branchId,
      name: branchName,
      isRoot: true,
      projectId,
    },
    update: {
      name: branchName,
    },
  });

  await prisma.revision.upsert({
    where: { id: headRevisionId },
    create: {
      id: headRevisionId,
      branchId,
      isStart: true,
      isHead: true,
      hasChanges: false,
    },
    update: {
      isHead: true,
      hasChanges: false,
    },
  });

  await prisma.revision.upsert({
    where: { id: draftRevisionId },
    create: {
      id: draftRevisionId,
      branchId,
      parentId: headRevisionId,
      hasChanges: true,
      isDraft: true,
    },
    update: {
      isDraft: true,
      hasChanges: true,
    },
  });

  await upsertSystemTable(prisma, {
    tableId: SystemTables.Schema,
    versionId: schemaVersionId,
    headRevisionId,
    draftRevisionId,
  });

  await upsertSystemTable(prisma, {
    tableId: SystemTables.Migration,
    versionId: migrationVersionId,
    headRevisionId,
    draftRevisionId,
  });

  await upsertEndpoints(prisma, { headRevisionId, draftRevisionId });
}

async function upsertSystemTable(
  prisma: PrismaService,
  params: {
    tableId: string;
    versionId: string;
    headRevisionId: string;
    draftRevisionId: string;
  },
): Promise<void> {
  const { tableId, versionId, headRevisionId, draftRevisionId } = params;

  const existing = await prisma.table.findUnique({
    where: { versionId },
  });

  if (!existing) {
    await prisma.table.create({
      data: {
        id: tableId,
        versionId,
        createdId: `created-${versionId}`,
        readonly: true,
        system: true,
        revisions: {
          connect: [{ id: headRevisionId }, { id: draftRevisionId }],
        },
      },
    });
  }
}

async function upsertEndpoints(
  prisma: PrismaService,
  params: {
    headRevisionId: string;
    draftRevisionId: string;
  },
): Promise<void> {
  const { headRevisionId, draftRevisionId } = params;

  const restId = `endpoint-rest-${headRevisionId}`;
  const gqlId = `endpoint-gql-${draftRevisionId}`;

  const existingRest = await prisma.endpoint.findUnique({ where: { id: restId } });
  if (!existingRest) {
    await prisma.endpoint.create({
      data: {
        id: restId,
        revision: { connect: { id: headRevisionId } },
        type: 'REST_API',
        version: { connect: { type_version: { type: 'REST_API', version: 1 } } },
      },
    });
  }

  const existingGql = await prisma.endpoint.findUnique({ where: { id: gqlId } });
  if (!existingGql) {
    await prisma.endpoint.create({
      data: {
        id: gqlId,
        revision: { connect: { id: draftRevisionId } },
        type: 'GRAPHQL',
        version: { connect: { type_version: { type: 'GRAPHQL', version: 1 } } },
      },
    });
  }
}

async function upsertTable(
  prisma: PrismaService,
  params: {
    headRevisionId: string;
    draftRevisionId: string;
    tableId: string;
    headVersionId: string;
    draftVersionId: string;
    schemaRowVersionId: string;
    schemaTableVersionId: string;
    migrationTableVersionId: string;
  },
): Promise<void> {
  const {
    headRevisionId,
    draftRevisionId,
    tableId,
    headVersionId,
    draftVersionId,
    schemaRowVersionId,
    schemaTableVersionId,
    migrationTableVersionId,
  } = params;

  const createdId = `created-${tableId}`;

  const existingHead = await prisma.table.findUnique({ where: { versionId: headVersionId } });
  if (!existingHead) {
    await prisma.table.create({
      data: {
        id: tableId,
        createdId,
        versionId: headVersionId,
        readonly: true,
        revisions: { connect: { id: headRevisionId } },
      },
    });
  }

  const existingDraft = await prisma.table.findUnique({ where: { versionId: draftVersionId } });
  if (!existingDraft) {
    await prisma.table.create({
      data: {
        id: tableId,
        createdId,
        versionId: draftVersionId,
        readonly: false,
        revisions: { connect: { id: draftRevisionId } },
      },
    });
  }

  const existingSchemaRow = await prisma.row.findUnique({ where: { versionId: schemaRowVersionId } });
  if (!existingSchemaRow) {
    await prisma.row.create({
      data: {
        id: tableId,
        versionId: schemaRowVersionId,
        createdId: `schema-row-created-${tableId}`,
        readonly: true,
        tables: { connect: { versionId: schemaTableVersionId } },
        data: testSchema,
        meta: [
          {
            patches: [{ op: 'add', path: '', value: testSchema } as JsonPatchAdd],
            hash: hash(testSchema),
            date: new Date().toISOString(),
          },
        ],
        hash: hash(testSchema),
        schemaHash: hash(metaSchema),
      },
    });
  }

  const migrationRowId = `migration-${tableId}`;
  const migrationDate = '2025-01-01T00:00:00.000Z';
  const migration: InitMigration = {
    changeType: 'init',
    id: migrationDate,
    tableId,
    hash: hash(testSchema),
    schema: testSchema,
  };

  const existingMigration = await prisma.row.findFirst({
    where: { id: migrationRowId },
  });
  if (!existingMigration) {
    await prisma.row.create({
      data: {
        id: migrationRowId,
        versionId: `migration-row-ver-${tableId}`,
        createdId: `migration-row-created-${tableId}`,
        readonly: true,
        tables: { connect: { versionId: migrationTableVersionId } },
        data: migration,
        hash: hash(migration),
        schemaHash: hash(tableMigrationsSchema),
        publishedAt: migrationDate,
      },
    });
  }
}

async function upsertRow(
  prisma: PrismaService,
  params: {
    tableHeadVersionId: string;
    tableDraftVersionId: string;
    rowId: string;
    headVersionId: string;
    draftVersionId: string;
  },
): Promise<void> {
  const {
    tableHeadVersionId,
    tableDraftVersionId,
    rowId,
    headVersionId,
    draftVersionId,
  } = params;

  const data = { ver: 1 };
  const dataDraft = { ver: 2 };
  const now = new Date();
  const createdId = `created-${rowId}`;

  const existingHead = await prisma.row.findUnique({ where: { versionId: headVersionId } });
  if (!existingHead) {
    await prisma.row.create({
      data: {
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        id: rowId,
        versionId: headVersionId,
        createdId,
        readonly: true,
        tables: { connect: { versionId: tableHeadVersionId } },
        data,
        hash: hash(data),
        schemaHash: hash(testSchema),
      },
    });
  }

  const existingDraft = await prisma.row.findUnique({ where: { versionId: draftVersionId } });
  if (!existingDraft) {
    await prisma.row.create({
      data: {
        createdAt: now,
        updatedAt: new Date(),
        publishedAt: now,
        id: rowId,
        versionId: draftVersionId,
        createdId,
        readonly: false,
        tables: { connect: { versionId: tableDraftVersionId } },
        data: dataDraft,
        hash: hash(dataDraft),
        schemaHash: hash(testSchema),
      },
    });
  }
}

async function seedWriteProjects(prisma: PrismaService): Promise<void> {
  await seedWriteCreateRowsProject(prisma);
  await seedWriteDeleteTableProject(prisma);
  await seedWriteUpdateTableProject(prisma);
  await seedWriteRenameTableProject(prisma);
  await seedWriteDeleteRowsProject(prisma);
  await seedWriteUpdateRowsProject(prisma);
  await seedWritePatchRowsProject(prisma);
}

async function seedWriteCreateRowsProject(prisma: PrismaService): Promise<void> {
  const w = m.writeCreateRows;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeCreateRowsSchemaVersionId,
    migrationVersionId: m.systemTables.writeCreateRowsMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeCreateRowsSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeCreateRowsMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: w.tableHeadVersionId,
    tableDraftVersionId: w.tableDraftVersionId,
    rowId: w.rowId,
    headVersionId: w.rowHeadVersionId,
    draftVersionId: w.rowDraftVersionId,
  });
}

async function seedWriteDeleteTableProject(prisma: PrismaService): Promise<void> {
  const w = m.writeDeleteTable;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeDeleteTableSchemaVersionId,
    migrationVersionId: m.systemTables.writeDeleteTableMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeDeleteTableSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeDeleteTableMigrationVersionId,
  });
}

async function seedWriteUpdateTableProject(prisma: PrismaService): Promise<void> {
  const w = m.writeUpdateTable;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeUpdateTableSchemaVersionId,
    migrationVersionId: m.systemTables.writeUpdateTableMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeUpdateTableSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeUpdateTableMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: w.tableHeadVersionId,
    tableDraftVersionId: w.tableDraftVersionId,
    rowId: w.rowId,
    headVersionId: w.rowHeadVersionId,
    draftVersionId: w.rowDraftVersionId,
  });
}

async function seedWriteRenameTableProject(prisma: PrismaService): Promise<void> {
  const w = m.writeRenameTable;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeRenameTableSchemaVersionId,
    migrationVersionId: m.systemTables.writeRenameTableMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeRenameTableSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeRenameTableMigrationVersionId,
  });
}

async function seedWriteDeleteRowsProject(prisma: PrismaService): Promise<void> {
  const w = m.writeDeleteRows;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeDeleteRowsSchemaVersionId,
    migrationVersionId: m.systemTables.writeDeleteRowsMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeDeleteRowsSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeDeleteRowsMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: w.tableHeadVersionId,
    tableDraftVersionId: w.tableDraftVersionId,
    rowId: w.rowId,
    headVersionId: w.rowHeadVersionId,
    draftVersionId: w.rowDraftVersionId,
  });
}

async function seedWriteUpdateRowsProject(prisma: PrismaService): Promise<void> {
  const w = m.writeUpdateRows;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writeUpdateRowsSchemaVersionId,
    migrationVersionId: m.systemTables.writeUpdateRowsMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writeUpdateRowsSchemaVersionId,
    migrationTableVersionId: m.systemTables.writeUpdateRowsMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: w.tableHeadVersionId,
    tableDraftVersionId: w.tableDraftVersionId,
    rowId: w.rowId,
    headVersionId: w.rowHeadVersionId,
    draftVersionId: w.rowDraftVersionId,
  });
}

async function seedWritePatchRowsProject(prisma: PrismaService): Promise<void> {
  const w = m.writePatchRows;

  await upsertProject(prisma, {
    organizationId: m.owner.organizationId,
    projectId: w.projectId,
    projectName: w.projectName,
    branchId: w.branchId,
    branchName: w.branchName,
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    schemaVersionId: m.systemTables.writePatchRowsSchemaVersionId,
    migrationVersionId: m.systemTables.writePatchRowsMigrationVersionId,
    isPublic: false,
  });

  await upsertTable(prisma, {
    headRevisionId: w.headRevisionId,
    draftRevisionId: w.draftRevisionId,
    tableId: w.tableId,
    headVersionId: w.tableHeadVersionId,
    draftVersionId: w.tableDraftVersionId,
    schemaRowVersionId: w.schemaRowVersionId,
    schemaTableVersionId: m.systemTables.writePatchRowsSchemaVersionId,
    migrationTableVersionId: m.systemTables.writePatchRowsMigrationVersionId,
  });

  await upsertRow(prisma, {
    tableHeadVersionId: w.tableHeadVersionId,
    tableDraftVersionId: w.tableDraftVersionId,
    rowId: w.rowId,
    headVersionId: w.rowHeadVersionId,
    draftVersionId: w.rowDraftVersionId,
  });
}

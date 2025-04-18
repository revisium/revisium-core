import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as hash from 'object-hash';
import { AuthService } from 'src/features/auth/auth.service';
import { UserRole } from 'src/features/auth/consts';
import {
  getTestLinkedSchema,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonPatchAdd } from 'src/features/share/utils/schema/types/json-patch.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export type PrepareDataReturnType = Awaited<ReturnType<typeof prepareData>>;

export type PrepareProjectReturnType = Awaited<
  ReturnType<typeof prepareProject>
>;

export const hashedPassword =
  '$2a$10$Uj1aVmkVJh4ZV9Ij54bFLexeFcYz71QtySoosQ5V.txpETjOgG0bW';

export const prepareData = async (app: INestApplication) => {
  const prismaService = app.get(PrismaService);

  const project = await prepareProject(prismaService);
  const anotherProject = await prepareProject(prismaService);

  return {
    project,
    owner: await prepareOrganizationUser(
      app,
      project.organizationId,
      UserRole.organizationOwner,
    ),
    anotherProject,
    anotherOwner: await prepareOrganizationUser(
      app,
      anotherProject.organizationId,
      UserRole.organizationOwner,
    ),
  };
};

const prepareOrganizationUser = async (
  app: INestApplication,
  organizationId: string,
  roleId: UserRole,
) => {
  const prismaService = app.get(PrismaService);
  const authService = app.get(AuthService);

  const userId = nanoid();

  const user = await prismaService.user.create({
    data: {
      id: userId,
      username: `username-${userId}`,
      roleId: UserRole.systemUser,
      password: hashedPassword,
      userOrganizations: {
        create: {
          id: nanoid(),
          organizationId,
          roleId,
        },
      },
    },
  });

  return {
    user,
    token: authService.login({
      username: user.username,
      sub: user.id,
    }),
  };
};

export const prepareProject = async (
  prismaService: PrismaService,
  options?: { createLinkedTable?: boolean },
) => {
  const organizationId = `org-${nanoid()}`;
  const projectId = `project-${nanoid()}`;
  const projectName = `name-${projectId}`;
  const branchId = `branch-${nanoid()}`;
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();

  const schemaTableVersionId = nanoid();
  const schemaRowVersionId = nanoid();
  const schemaTableCreatedId = nanoid();
  const tableId = `table-${nanoid()}`;
  const createdIdForTableInSchemaTable = `table-${nanoid()}`;
  const linkedTableId = `table-${nanoid()}`;
  const tableCreatedId = nanoid();
  const linkedTableCreatedId = nanoid();
  const headTableVersionId = nanoid();
  const headLinkedTableVersionId = nanoid();
  const draftTableVersionId = nanoid();
  const draftLinkedTableVersionId = nanoid();
  const rowId = `row-${nanoid()}`;
  const linkedRowId = `row-${nanoid()}`;
  const rowCreatedId = nanoid();
  const linkedRowCreatedId = nanoid();
  const headRowVersionId = nanoid();
  const headLinkedRowVersionId = nanoid();
  const draftRowVersionId = nanoid();
  const draftLinkedRowVersionId = nanoid();
  const headEndpointId = nanoid();
  const draftEndpointId = nanoid();

  // branch / project / organization / revisions
  await prismaService.branch.create({
    data: {
      id: branchId,
      name: branchName,
      project: {
        create: {
          id: projectId,
          name: projectName,
          organization: {
            create: {
              id: organizationId,
            },
          },
        },
      },
      revisions: {
        createMany: {
          data: [
            {
              id: headRevisionId,
              isHead: true,
              hasChanges: false,
            },
            {
              id: draftRevisionId,
              parentId: headRevisionId,
              hasChanges: true,
              isDraft: true,
            },
          ],
        },
      },
    },
  });

  // schema table
  await prismaService.table.create({
    data: {
      id: SystemTables.Schema,
      versionId: schemaTableVersionId,
      createdId: schemaTableCreatedId,
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
    },
  });

  // table
  await prismaService.table.create({
    data: {
      id: tableId,
      createdId: tableCreatedId,
      versionId: headTableVersionId,
      readonly: true,
      revisions: {
        connect: { id: headRevisionId },
      },
    },
  });
  await prismaService.table.create({
    data: {
      id: tableId,
      createdId: tableCreatedId,
      versionId: draftTableVersionId,
      readonly: false,
      revisions: {
        connect: { id: draftRevisionId },
      },
    },
  });

  // schema for table in SystemTable.schema
  await prismaService.row.create({
    data: {
      id: tableId,
      versionId: schemaRowVersionId,
      createdId: createdIdForTableInSchemaTable,
      readonly: true,
      tables: {
        connect: {
          versionId: schemaTableVersionId,
        },
      },
      data: testSchema,
      meta: [
        {
          patches: [
            {
              op: 'add',
              path: '',
              value: testSchema,
            } as JsonPatchAdd,
          ],
          hash: hash(testSchema),
        },
      ],
      hash: hash(testSchema),
      schemaHash: hash(metaSchema),
    },
  });

  // row
  await prismaService.row.create({
    data: {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      id: rowId,
      versionId: headRowVersionId,
      createdId: rowCreatedId,
      readonly: true,
      tables: {
        connect: {
          versionId: headTableVersionId,
        },
      },
      data: { ver: 1 },
      hash: hash({ ver: 1 }),
      schemaHash: hash(testSchema),
    },
  });
  await prismaService.row.create({
    data: {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      id: rowId,
      versionId: draftRowVersionId,
      createdId: rowCreatedId,
      readonly: false,
      tables: {
        connect: {
          versionId: draftTableVersionId,
        },
      },
      data: { ver: 2 },
      hash: hash({ ver: 2 }),
      schemaHash: hash(testSchema),
    },
  });

  if (options?.createLinkedTable) {
    // schema for linked table in SystemTable.schema
    const linkedSchema = getTestLinkedSchema(tableId);
    await prismaService.row.create({
      data: {
        id: linkedTableId,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: true,
        tables: {
          connect: {
            versionId: schemaTableVersionId,
          },
        },
        data: linkedSchema,
        meta: [
          {
            patches: [
              {
                op: 'add',
                path: '',
                value: linkedSchema,
              } as JsonPatchAdd,
            ],
            hash: hash(linkedSchema),
          },
        ],
        hash: hash(linkedSchema),
        schemaHash: hash(metaSchema),
      },
    });

    // linked table
    await prismaService.table.create({
      data: {
        id: linkedTableId,
        createdId: linkedTableCreatedId,
        versionId: headLinkedTableVersionId,
        readonly: true,
        revisions: {
          connect: { id: headRevisionId },
        },
      },
    });
    await prismaService.table.create({
      data: {
        id: linkedTableId,
        createdId: linkedTableCreatedId,
        versionId: draftLinkedTableVersionId,
        readonly: false,
        revisions: {
          connect: { id: draftRevisionId },
        },
      },
    });

    // linked row
    await prismaService.row.create({
      data: {
        id: linkedRowId,
        versionId: headLinkedRowVersionId,
        createdId: linkedRowCreatedId,
        readonly: true,
        tables: {
          connect: {
            versionId: headLinkedTableVersionId,
          },
        },
        data: { link: rowId },
        hash: hash({ link: rowId }),
        schemaHash: hash(linkedSchema),
      },
    });
    await prismaService.row.create({
      data: {
        id: linkedRowId,
        versionId: draftLinkedRowVersionId,
        createdId: linkedRowCreatedId,
        readonly: false,
        tables: {
          connect: {
            versionId: draftLinkedTableVersionId,
          },
        },
        data: { link: rowId },
        hash: hash({ link: rowId }),
        schemaHash: hash(linkedSchema),
      },
    });
  }

  // endpoint
  await prismaService.endpoint.create({
    data: {
      id: headEndpointId,
      revisionId: headRevisionId,
      type: 'REST_API',
    },
  });
  await prismaService.endpoint.create({
    data: {
      id: draftEndpointId,
      revisionId: draftRevisionId,
      type: 'GRAPHQL',
    },
  });

  return {
    organizationId,
    projectId,
    projectName,
    branchId,
    branchName,
    headRevisionId,
    draftRevisionId,
    tableId,
    createdIdForTableInSchemaTable,
    linkedTableId,
    tableCreatedId,
    linkedTableCreatedId,
    headTableVersionId,
    headLinkedTableVersionId,
    draftTableVersionId,
    draftLinkedTableVersionId,
    rowId,
    linkedRowId,
    rowCreatedId,
    linkedRowCreatedId,
    headRowVersionId,
    headLinkedRowVersionId,
    draftRowVersionId,
    draftLinkedRowVersionId,
    headEndpointId,
    draftEndpointId,
    schemaTableVersionId,
    schemaRowVersionId,
    schemaTableCreatedId,
  };
};

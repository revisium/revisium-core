import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
} from '@revisium/schema-toolkit/mocks';
import { AuthService } from 'src/features/auth/auth.service';
import {
  UserRole,
  UserOrganizationRoles,
  UserProjectRoles,
} from 'src/features/auth/consts';
import {
  getTestLinkedSchema,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { FileStatus } from 'src/features/plugin/file/consts';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { tableMigrationsSchema } from 'src/features/share/schema/table-migrations-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  JsonPatchAdd,
  InitMigration,
  JsonSchema,
} from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export type PrepareDataReturnType = Awaited<ReturnType<typeof prepareData>>;

export type PrepareProjectReturnType = Awaited<
  ReturnType<typeof prepareProject>
>;

export const hashedPassword =
  '$2a$10$Uj1aVmkVJh4ZV9Ij54bFLexeFcYz71QtySoosQ5V.txpETjOgG0bW';

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
      isEmailConfirmed: true,
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

export const prepareData = async (
  app: INestApplication,
  options?: { createLinkedTable?: boolean },
) => {
  const prismaService = app.get(PrismaService);

  const project = await prepareProject(prismaService, options);
  const anotherProject = await prepareProject(prismaService, options);

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

export async function prepareBranch(prismaService: PrismaService) {
  const organizationId = `org-${nanoid()}`;
  const projectId = `project-${nanoid()}`;
  const projectName = `name-${projectId}`;
  const branchId = `branch-${nanoid()}`;
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();

  await prismaService.branch.create({
    data: {
      id: branchId,
      name: branchName,
      isRoot: true,
      project: {
        create: {
          id: projectId,
          name: projectName,
          organization: {
            create: {
              id: organizationId,
              createdId: nanoid(),
            },
          },
        },
      },
      revisions: {
        createMany: {
          data: [
            {
              id: headRevisionId,
              isStart: true,
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

  const schemaTableVersionId = nanoid();
  const schemaTableCreatedId = nanoid();

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

  // migration table

  const migrationTableVersionId = nanoid();
  const migrationTableCreatedId = nanoid();

  await prismaService.table.create({
    data: {
      id: SystemTables.Migration,
      versionId: migrationTableVersionId,
      createdId: migrationTableCreatedId,
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
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
    schemaTableVersionId,
    schemaTableCreatedId,
    migrationTableVersionId,
    migrationTableCreatedId,
  };
}

async function prepareEndpoint({
  prismaService,
  headRevisionId,
  draftRevisionId,
}: {
  prismaService: PrismaService;
  headRevisionId: string;
  draftRevisionId: string;
}) {
  const headEndpointId = nanoid();
  const draftEndpointId = nanoid();

  // endpoint
  await prismaService.endpoint.create({
    data: {
      id: headEndpointId,
      revision: {
        connect: {
          id: headRevisionId,
        },
      },
      type: 'REST_API',
      version: {
        connect: {
          type_version: {
            type: 'REST_API',
            version: 1,
          },
        },
      },
    },
  });
  await prismaService.endpoint.create({
    data: {
      id: draftEndpointId,
      revision: {
        connect: {
          id: draftRevisionId,
        },
      },
      type: 'GRAPHQL',
      version: {
        connect: {
          type_version: {
            type: 'GRAPHQL',
            version: 1,
          },
        },
      },
    },
  });

  return {
    headEndpointId,
    draftEndpointId,
  };
}

export async function prepareTableWithSchema({
  prismaService,
  headRevisionId,
  draftRevisionId,
  schemaTableVersionId,
  migrationTableVersionId,
  schema,
}: {
  prismaService: PrismaService;
  headRevisionId: string;
  draftRevisionId: string;
  schemaTableVersionId: string;
  migrationTableVersionId: string;
  schema: JsonSchema;
}) {
  const schemaRowVersionId = nanoid();
  const migrationRowVersionId = nanoid();
  const tableId = `table-${nanoid()}`;
  const createdIdForTableInSchemaTable = `table-${nanoid()}`;
  const tableCreatedId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();

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
      data: schema,
      meta: [
        {
          patches: [
            {
              op: 'add',
              path: '',
              value: schema,
            } as JsonPatchAdd,
          ],
          hash: hash(schema),
          date: new Date(),
        },
      ],
      hash: hash(schema),
      schemaHash: hash(metaSchema),
    },
  });

  // migration

  const migration: InitMigration = {
    changeType: 'init',
    id: '2025-01-01T00:00:00Z',
    tableId,
    hash: hash(schema),
    schema,
  };

  await prismaService.row.create({
    data: {
      id: migration.id,
      versionId: migrationRowVersionId,
      createdId: nanoid(),
      readonly: true,
      tables: {
        connect: {
          versionId: migrationTableVersionId,
        },
      },
      data: migration,
      hash: hash(migration),
      schemaHash: hash(tableMigrationsSchema),
      publishedAt: migration.id,
    },
  });

  return {
    schemaRowVersionId,
    tableId,
    createdIdForTableInSchemaTable,
    tableCreatedId,
    headTableVersionId,
    draftTableVersionId,
    schema,
  };
}

export async function prepareRow({
  prismaService,
  headTableVersionId,
  draftTableVersionId,
  data,
  dataDraft,
  schema,
}: {
  prismaService: PrismaService;
  headTableVersionId: string;
  draftTableVersionId: string;
  data: object;
  dataDraft: object;
  schema: JsonSchema;
}) {
  const rowId = `row-${nanoid()}`;
  const rowCreatedId = nanoid();
  const headRowVersionId = nanoid();
  const draftRowVersionId = nanoid();

  // row
  const row = await prismaService.row.create({
    data: {
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      id: rowId,
      versionId: headRowVersionId,
      createdId: rowCreatedId,
      readonly: true,
      tables: {
        connect: {
          versionId: headTableVersionId,
        },
      },
      data,
      hash: hash(data),
      schemaHash: hash(schema),
    },
  });
  const rowDraft = await prismaService.row.create({
    data: {
      createdAt: row.createdAt,
      updatedAt: new Date(),
      publishedAt: row.publishedAt,
      id: rowId,
      versionId: draftRowVersionId,
      createdId: rowCreatedId,
      readonly: false,
      tables: {
        connect: {
          versionId: draftTableVersionId,
        },
      },
      data: dataDraft,
      hash: hash(dataDraft),
      schemaHash: hash(testSchema),
    },
  });

  return {
    row,
    rowDraft,
    rowId,
    rowCreatedId,
    headRowVersionId,
    draftRowVersionId,
  };
}

export const prepareProject = async (
  prismaService: PrismaService,
  options?: { createLinkedTable?: boolean },
) => {
  const prepareBranchResult = await prepareBranch(prismaService);
  const {
    headRevisionId,
    draftRevisionId,
    schemaTableVersionId,
    migrationTableVersionId,
  } = prepareBranchResult;
  const resultPrepareTableWithSchema = await prepareTableWithSchema({
    prismaService,
    headRevisionId,
    draftRevisionId,
    schemaTableVersionId,
    migrationTableVersionId,
    schema: testSchema,
  });
  const { headTableVersionId, draftTableVersionId, tableId } =
    resultPrepareTableWithSchema;
  const resultPrepareRow = await prepareRow({
    prismaService,
    headTableVersionId,
    draftTableVersionId,
    data: { ver: 1 },
    dataDraft: { ver: 2 },
    schema: testSchema,
  });
  const { rowId } = resultPrepareRow;

  let linkedTable:
    | Awaited<ReturnType<typeof prepareTableWithSchema>>
    | undefined = undefined;

  let linkedRow: Awaited<ReturnType<typeof prepareRow>> | undefined = undefined;

  if (options?.createLinkedTable) {
    const linkedSchema = getTestLinkedSchema(tableId);
    linkedTable = await prepareTableWithSchema({
      prismaService,
      headRevisionId,
      draftRevisionId,
      schemaTableVersionId,
      migrationTableVersionId,
      schema: getTestLinkedSchema(tableId),
    });

    linkedRow = await prepareRow({
      prismaService,
      headTableVersionId: linkedTable.headTableVersionId,
      draftTableVersionId: linkedTable.draftTableVersionId,
      data: { link: rowId },
      dataDraft: { link: rowId },
      schema: linkedSchema,
    });
  }

  const prepareEndpointResult = await prepareEndpoint({
    prismaService,
    headRevisionId,
    draftRevisionId,
  });

  return {
    ...prepareBranchResult,
    ...prepareEndpointResult,
    ...resultPrepareTableWithSchema,
    ...resultPrepareRow,
    linkedTable,
    linkedRow,
  };
};

export const prepareTableAndRowWithFile = async (
  prismaService: PrismaService,
  data: object,
) => {
  const {
    headRevisionId,
    draftRevisionId,
    schemaTableVersionId,
    migrationTableVersionId,
  } = await prepareProject(prismaService);

  const table = await prepareTableWithSchema({
    prismaService,
    headRevisionId,
    draftRevisionId,
    schemaTableVersionId,
    migrationTableVersionId,
    schema: getObjectSchema({
      file: getRefSchema(SystemSchemaIds.File),
      files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
    }),
  });

  const { row, rowDraft } = await prepareRow({
    prismaService,
    headTableVersionId: table.headTableVersionId,
    draftTableVersionId: table.draftTableVersionId,
    schema: table.schema,
    data: data,
    dataDraft: data,
  });

  return {
    headRevisionId,
    draftRevisionId,
    table,
    row,
    rowDraft,
  };
};

export const createPreviousFile = () => {
  const file = createEmptyFile();
  file.status = FileStatus.ready;
  file.fileId = nanoid();
  return file;
};

export const createEmptyFile = () => ({
  status: '',
  fileId: '',
  url: '',
  fileName: '',
  hash: '',
  extension: '',
  mimeType: '',
  size: 0,
  width: 0,
  height: 0,
});

export const prepareProjectUser = async (
  app: INestApplication,
  organizationId: string,
  projectId: string,
  organizationRole: UserOrganizationRoles,
  projectRole: UserProjectRoles,
) => {
  const prismaService = app.get(PrismaService);
  const authService = app.get(AuthService);

  const userId = nanoid();

  const user = await prismaService.user.create({
    data: {
      id: userId,
      username: `user-${projectRole}-${userId}`,
      roleId: UserRole.systemUser,
      password: hashedPassword,
      isEmailConfirmed: true,
      userOrganizations: {
        create: {
          id: nanoid(),
          organizationId,
          roleId: organizationRole,
        },
      },
      userProjects: {
        create: {
          id: nanoid(),
          projectId,
          roleId: projectRole,
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

export type PrepareProjectUserReturnType = Awaited<
  ReturnType<typeof prepareProjectUser>
>;

export const prepareDataWithRoles = async (
  app: INestApplication,
  options?: { createLinkedTable?: boolean },
) => {
  const prismaService = app.get(PrismaService);

  const project = await prepareProject(prismaService, options);

  const owner = await prepareOrganizationUser(
    app,
    project.organizationId,
    UserRole.organizationOwner,
  );

  const developer = await prepareProjectUser(
    app,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.developer,
    UserProjectRoles.developer,
  );

  const editor = await prepareProjectUser(
    app,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.editor,
    UserProjectRoles.editor,
  );

  const reader = await prepareProjectUser(
    app,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.reader,
    UserProjectRoles.reader,
  );

  const anotherProject = await prepareProject(prismaService, options);
  const anotherOwner = await prepareOrganizationUser(
    app,
    anotherProject.organizationId,
    UserRole.organizationOwner,
  );

  return {
    project,
    owner,
    developer,
    editor,
    reader,
    anotherProject,
    anotherOwner,
  };
};

export type PrepareDataWithRolesReturnType = Awaited<
  ReturnType<typeof prepareDataWithRoles>
>;

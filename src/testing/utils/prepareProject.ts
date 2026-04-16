import type { INestApplicationContext } from '@nestjs/common';
import { nanoid } from 'nanoid';
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
} from 'src/testing/utils/test-schemas';
import { FileStatus } from 'src/features/plugin/file/consts';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { TableApiService } from 'src/features/table/table-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { SystemTables } from 'src/features/share/system-tables.consts';

export type PrepareDataReturnType = Awaited<ReturnType<typeof prepareData>>;
export type PrepareProjectReturnType = Awaited<
  ReturnType<typeof prepareProject>
>;

type TestingContainer = Pick<INestApplicationContext, 'get'>;

type TestingServices = {
  prismaService: PrismaService;
  authService: AuthService;
  projectApi: ProjectApiService;
  branchApi: BranchApiService;
  revisionsApi: RevisionsApiService;
  tableApi: TableApiService;
  rowApi: RowApiService;
};

type ProjectBase = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  headRevisionId: string;
  draftRevisionId: string;
  schemaTableVersionId: string;
  schemaTableCreatedId: string;
  sharedSchemasTableVersionId: string;
  sharedSchemasTableCreatedId: string;
  migrationTableVersionId: string;
  migrationTableCreatedId: string;
};

type CommittedTableScenario = {
  headRevisionId: string;
  draftRevisionId: string;
  tableId: string;
  tableCreatedId: string;
  headTableVersionId: string;
  draftTableVersionId: string;
  schemaRowVersionId: string;
  schema: JsonSchema;
};

type CommittedRowScenario = {
  headRevisionId: string;
  draftRevisionId: string;
  rowId: string;
  rowCreatedId: string;
  headRowVersionId: string;
  draftRowVersionId: string;
  row: Awaited<ReturnType<PrismaService['row']['findUniqueOrThrow']>>;
  rowDraft: Awaited<ReturnType<PrismaService['row']['findUniqueOrThrow']>>;
};

export const hashedPassword =
  '$2a$10$Uj1aVmkVJh4ZV9Ij54bFLexeFcYz71QtySoosQ5V.txpETjOgG0bW';

function getTestingServices(container: TestingContainer): TestingServices {
  return {
    prismaService: container.get(PrismaService),
    authService: container.get(AuthService),
    projectApi: container.get(ProjectApiService),
    branchApi: container.get(BranchApiService),
    revisionsApi: container.get(RevisionsApiService),
    tableApi: container.get(TableApiService),
    rowApi: container.get(RowApiService),
  };
}

const prepareOrganizationUser = async (
  container: TestingContainer,
  organizationId: string,
  roleId: UserRole,
) => {
  const { prismaService, authService } = getTestingServices(container);
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

async function createOrganization(prismaService: PrismaService) {
  return prismaService.organization.create({
    data: {
      id: `org-${nanoid()}`,
      createdId: nanoid(),
    },
  });
}

async function getRevisionSystemTables(
  prismaService: PrismaService,
  revisionId: string,
) {
  const tables = await prismaService.table.findMany({
    where: {
      revisions: {
        some: {
          id: revisionId,
        },
      },
      id: {
        in: [
          SystemTables.Schema,
          SystemTables.SharedSchemas,
          SystemTables.Migration,
        ],
      },
    },
    select: {
      id: true,
      versionId: true,
      createdId: true,
    },
  });

  const schemaTable = tables.find((table) => table.id === SystemTables.Schema);
  const sharedSchemasTable = tables.find(
    (table) => table.id === SystemTables.SharedSchemas,
  );
  const migrationTable = tables.find(
    (table) => table.id === SystemTables.Migration,
  );

  if (!schemaTable || !sharedSchemasTable || !migrationTable) {
    throw new Error(
      `System tables were not created for revision ${revisionId}`,
    );
  }

  return {
    schemaTableVersionId: schemaTable.versionId,
    schemaTableCreatedId: schemaTable.createdId,
    sharedSchemasTableVersionId: sharedSchemasTable.versionId,
    sharedSchemasTableCreatedId: sharedSchemasTable.createdId,
    migrationTableVersionId: migrationTable.versionId,
    migrationTableCreatedId: migrationTable.createdId,
  };
}

async function loadProjectBase(
  container: TestingContainer,
  organizationId: string,
): Promise<ProjectBase> {
  const { prismaService, projectApi, branchApi } =
    getTestingServices(container);
  const projectName = `project-${nanoid()}`;

  const project = await projectApi.apiCreateProject({
    organizationId,
    projectName,
  });
  const branch = await projectApi.getRootBranchByProject(project.id);
  const headRevision = await branchApi.getHeadRevision(branch.id);
  const draftRevision = await branchApi.getDraftRevision(branch.id);
  const systemTables = await getRevisionSystemTables(
    prismaService,
    headRevision.id,
  );

  return {
    organizationId,
    projectId: project.id,
    projectName,
    branchId: branch.id,
    branchName: branch.name,
    headRevisionId: headRevision.id,
    draftRevisionId: draftRevision.id,
    ...systemTables,
  };
}

async function resolveCurrentBranchState(
  container: TestingContainer,
  projectId: string,
  branchName: string,
) {
  const { branchApi } = getTestingServices(container);
  const branch = await branchApi.getBranch({ projectId, branchName });
  const headRevision = await branchApi.getHeadRevision(branch.id);
  const draftRevision = await branchApi.getDraftRevision(branch.id);

  return {
    branch,
    headRevision,
    draftRevision,
  };
}

async function createEndpoints({
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

async function loadTableVersionForRevision(
  prismaService: PrismaService,
  revisionId: string,
  tableId: string,
) {
  return prismaService.table.findFirstOrThrow({
    where: {
      id: tableId,
      revisions: {
        some: {
          id: revisionId,
        },
      },
    },
  });
}

async function loadSchemaRowVersion(
  prismaService: PrismaService,
  schemaTableVersionId: string,
  tableId: string,
) {
  return prismaService.row.findFirstOrThrow({
    where: {
      id: tableId,
      tables: {
        some: {
          versionId: schemaTableVersionId,
        },
      },
    },
  });
}

async function loadRowVersionForRevision(
  prismaService: PrismaService,
  revisionId: string,
  tableId: string,
  rowId: string,
) {
  return prismaService.row.findFirstOrThrow({
    where: {
      id: rowId,
      tables: {
        some: {
          id: tableId,
          revisions: {
            some: {
              id: revisionId,
            },
          },
        },
      },
    },
  });
}

async function commitRevision(
  container: TestingContainer,
  projectId: string,
  branchName: string,
) {
  const { revisionsApi } = getTestingServices(container);
  await revisionsApi.createRevision({
    projectId,
    branchName,
    comment: 'test-seed',
  });

  return resolveCurrentBranchState(container, projectId, branchName);
}

export const prepareData = async (
  container: TestingContainer,
  options?: { createLinkedTable?: boolean },
) => {
  const project = await prepareProject(container, options);
  const anotherProject = await prepareProject(container, options);

  return {
    project,
    owner: await prepareOrganizationUser(
      container,
      project.organizationId,
      UserRole.organizationOwner,
    ),
    anotherProject,
    anotherOwner: await prepareOrganizationUser(
      container,
      anotherProject.organizationId,
      UserRole.organizationOwner,
    ),
  };
};

export async function prepareBranch(container: TestingContainer) {
  const { prismaService } = getTestingServices(container);
  const organization = await createOrganization(prismaService);
  return loadProjectBase(container, organization.id);
}

export async function prepareTableWithSchema(
  container: TestingContainer,
  {
    projectId,
    branchName,
    draftRevisionId,
    schema,
    tableId = `table-${nanoid()}`,
  }: {
    projectId: string;
    branchName: string;
    draftRevisionId: string;
    schema: JsonSchema;
    tableId?: string;
  },
): Promise<CommittedTableScenario> {
  const { prismaService, tableApi } = getTestingServices(container);

  await tableApi.createTable({
    revisionId: draftRevisionId,
    tableId,
    schema,
  });

  const { headRevision, draftRevision } = await commitRevision(
    container,
    projectId,
    branchName,
  );

  const systemTables = await getRevisionSystemTables(
    prismaService,
    headRevision.id,
  );
  const headTable = await loadTableVersionForRevision(
    prismaService,
    headRevision.id,
    tableId,
  );
  const draftTable = await loadTableVersionForRevision(
    prismaService,
    draftRevision.id,
    tableId,
  );
  const schemaRow = await loadSchemaRowVersion(
    prismaService,
    systemTables.schemaTableVersionId,
    tableId,
  );

  return {
    headRevisionId: headRevision.id,
    draftRevisionId: draftRevision.id,
    tableId,
    tableCreatedId: headTable.createdId,
    headTableVersionId: headTable.versionId,
    draftTableVersionId: draftTable.versionId,
    schemaRowVersionId: schemaRow.versionId,
    schema,
  };
}

export async function prepareRow(
  container: TestingContainer,
  {
    projectId,
    branchName,
    draftRevisionId,
    tableId,
    data,
    dataDraft,
    rowId = `row-${nanoid()}`,
  }: {
    projectId: string;
    branchName: string;
    draftRevisionId: string;
    tableId: string;
    data: object;
    dataDraft: object;
    rowId?: string;
  },
): Promise<CommittedRowScenario> {
  const { prismaService, rowApi } = getTestingServices(container);

  await rowApi.createRow({
    revisionId: draftRevisionId,
    tableId,
    rowId,
    data,
  });

  const committed = await commitRevision(container, projectId, branchName);

  if (JSON.stringify(dataDraft) !== JSON.stringify(data)) {
    await rowApi.updateRow({
      revisionId: committed.draftRevision.id,
      tableId,
      rowId,
      data: dataDraft,
    });
  }

  const row = await loadRowVersionForRevision(
    prismaService,
    committed.headRevision.id,
    tableId,
    rowId,
  );
  const rowDraft = await loadRowVersionForRevision(
    prismaService,
    committed.draftRevision.id,
    tableId,
    rowId,
  );

  return {
    headRevisionId: committed.headRevision.id,
    draftRevisionId: committed.draftRevision.id,
    rowId,
    rowCreatedId: row.createdId,
    headRowVersionId: row.versionId,
    draftRowVersionId: rowDraft.versionId,
    row,
    rowDraft,
  };
}

export const prepareProject = async (
  container: TestingContainer,
  options?: { createLinkedTable?: boolean },
) => {
  const { prismaService, tableApi, rowApi } = getTestingServices(container);
  const organization = await createOrganization(prismaService);
  const projectBase = await loadProjectBase(container, organization.id);

  const endpoints = await createEndpoints({
    prismaService,
    headRevisionId: projectBase.headRevisionId,
    draftRevisionId: projectBase.draftRevisionId,
  });

  const tableId = `table-${nanoid()}`;
  const rowId = `row-${nanoid()}`;

  await tableApi.createTable({
    revisionId: projectBase.draftRevisionId,
    tableId,
    schema: testSchema,
  });
  await rowApi.createRow({
    revisionId: projectBase.draftRevisionId,
    tableId,
    rowId,
    data: { ver: 1 },
  });

  let linkedTable: CommittedTableScenario | undefined;
  let linkedRow: CommittedRowScenario | undefined;

  if (options?.createLinkedTable) {
    const linkedTableId = `table-${nanoid()}`;
    const linkedSchema = getTestLinkedSchema(tableId);

    await tableApi.createTable({
      revisionId: projectBase.draftRevisionId,
      tableId: linkedTableId,
      schema: linkedSchema,
    });
    await rowApi.createRow({
      revisionId: projectBase.draftRevisionId,
      tableId: linkedTableId,
      rowId: `row-${nanoid()}`,
      data: { link: rowId },
    });
  }

  const committed = await commitRevision(
    container,
    projectBase.projectId,
    projectBase.branchName,
  );

  await rowApi.updateRow({
    revisionId: committed.draftRevision.id,
    tableId,
    rowId,
    data: { ver: 2 },
  });

  const systemTables = await getRevisionSystemTables(
    prismaService,
    committed.headRevision.id,
  );
  const schemaRow = await loadSchemaRowVersion(
    prismaService,
    systemTables.schemaTableVersionId,
    tableId,
  );
  const headTable = await loadTableVersionForRevision(
    prismaService,
    committed.headRevision.id,
    tableId,
  );
  const draftTable = await loadTableVersionForRevision(
    prismaService,
    committed.draftRevision.id,
    tableId,
  );
  const row = await loadRowVersionForRevision(
    prismaService,
    committed.headRevision.id,
    tableId,
    rowId,
  );
  const rowDraft = await loadRowVersionForRevision(
    prismaService,
    committed.draftRevision.id,
    tableId,
    rowId,
  );

  if (options?.createLinkedTable) {
    const linkedDraftTables = await prismaService.table.findMany({
      where: {
        revisions: {
          some: {
            id: committed.draftRevision.id,
          },
        },
        id: {
          not: tableId,
        },
        system: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    const linkedCurrent = linkedDraftTables[0];
    if (linkedCurrent) {
      const linkedHeadTable = await loadTableVersionForRevision(
        prismaService,
        committed.headRevision.id,
        linkedCurrent.id,
      );
      const linkedDraftTable = await loadTableVersionForRevision(
        prismaService,
        committed.draftRevision.id,
        linkedCurrent.id,
      );
      const linkedSchemaRow = await loadSchemaRowVersion(
        prismaService,
        systemTables.schemaTableVersionId,
        linkedCurrent.id,
      );
      const linkedHeadRow = await prismaService.row.findFirstOrThrow({
        where: {
          tables: {
            some: {
              versionId: linkedHeadTable.versionId,
            },
          },
        },
      });
      const linkedDraftRow = await prismaService.row.findFirstOrThrow({
        where: {
          id: linkedHeadRow.id,
          tables: {
            some: {
              versionId: linkedDraftTable.versionId,
            },
          },
        },
      });

      linkedTable = {
        headRevisionId: committed.headRevision.id,
        draftRevisionId: committed.draftRevision.id,
        tableId: linkedCurrent.id,
        tableCreatedId: linkedHeadTable.createdId,
        headTableVersionId: linkedHeadTable.versionId,
        draftTableVersionId: linkedDraftTable.versionId,
        schemaRowVersionId: linkedSchemaRow.versionId,
        schema: getTestLinkedSchema(tableId),
      };
      linkedRow = {
        headRevisionId: committed.headRevision.id,
        draftRevisionId: committed.draftRevision.id,
        rowId: linkedHeadRow.id,
        rowCreatedId: linkedHeadRow.createdId,
        headRowVersionId: linkedHeadRow.versionId,
        draftRowVersionId: linkedDraftRow.versionId,
        row: linkedHeadRow,
        rowDraft: linkedDraftRow,
      };
    }
  }

  return {
    organizationId: projectBase.organizationId,
    projectId: projectBase.projectId,
    projectName: projectBase.projectName,
    branchId: projectBase.branchId,
    branchName: projectBase.branchName,
    headRevisionId: committed.headRevision.id,
    draftRevisionId: committed.draftRevision.id,
    ...systemTables,
    ...endpoints,
    schemaRowVersionId: schemaRow.versionId,
    tableId,
    tableCreatedId: headTable.createdId,
    headTableVersionId: headTable.versionId,
    draftTableVersionId: draftTable.versionId,
    rowId,
    rowCreatedId: row.createdId,
    headRowVersionId: row.versionId,
    draftRowVersionId: rowDraft.versionId,
    row,
    rowDraft,
    linkedTable,
    linkedRow,
  };
};

export const prepareTableAndRowWithFile = async (
  container: TestingContainer,
  data: object,
) => {
  const project = await prepareProject(container);

  const table = await prepareTableWithSchema(container, {
    projectId: project.projectId,
    branchName: project.branchName,
    draftRevisionId: project.draftRevisionId,
    schema: getObjectSchema({
      file: getRefSchema(SystemSchemaIds.File),
      files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
    }),
  });

  const rowResult = await prepareRow(container, {
    projectId: project.projectId,
    branchName: project.branchName,
    draftRevisionId: table.draftRevisionId,
    tableId: table.tableId,
    data,
    dataDraft: data,
  });

  return {
    headRevisionId: rowResult.headRevisionId,
    draftRevisionId: rowResult.draftRevisionId,
    table,
    row: rowResult.row,
    rowDraft: rowResult.rowDraft,
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
  container: TestingContainer,
  organizationId: string,
  projectId: string,
  organizationRole: UserOrganizationRoles,
  projectRole: UserProjectRoles,
) => {
  const { prismaService, authService } = getTestingServices(container);
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
  container: TestingContainer,
  options?: { createLinkedTable?: boolean },
) => {
  const project = await prepareProject(container, options);

  const owner = await prepareOrganizationUser(
    container,
    project.organizationId,
    UserRole.organizationOwner,
  );

  const developer = await prepareProjectUser(
    container,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.developer,
    UserProjectRoles.developer,
  );

  const editor = await prepareProjectUser(
    container,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.editor,
    UserProjectRoles.editor,
  );

  const reader = await prepareProjectUser(
    container,
    project.organizationId,
    project.projectId,
    UserOrganizationRoles.reader,
    UserProjectRoles.reader,
  );

  const anotherProject = await prepareProject(container, options);
  const anotherOwner = await prepareOrganizationUser(
    container,
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

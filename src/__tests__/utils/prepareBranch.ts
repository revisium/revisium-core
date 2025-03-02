import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as hash from 'object-hash';
import { AuthService } from 'src/features/auth/auth.service';
import { UserRole } from 'src/features/auth/consts';
import { testSchema } from 'src/features/draft/commands/handlers/__tests__/utils';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonPatchAdd } from 'src/features/share/utils/schema/types/json-patch.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export type PrepareDataReturnType = Awaited<ReturnType<typeof prepareData>>;

export type PrepareBranchReturnType = Awaited<ReturnType<typeof prepareBranch>>;

export const hashedPassword =
  '$2a$10$Uj1aVmkVJh4ZV9Ij54bFLexeFcYz71QtySoosQ5V.txpETjOgG0bW';

export const prepareData = async (app: INestApplication) => {
  const prismaService = app.get(PrismaService);

  const project = await prepareBranch(prismaService);
  const anotherProject = await prepareBranch(prismaService);

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

export const prepareBranch = async (prismaService: PrismaService) => {
  const organizationId = nanoid();
  const projectId = nanoid();
  const projectName = `name-${projectId}`;
  const branchId = nanoid();
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();
  const headChangelogId = nanoid();
  const draftChangelogId = nanoid();

  const schemaTableVersionId = nanoid();
  const schemaTableCreatedId = nanoid();
  const tableId = nanoid();
  const tableCreatedId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();
  const rowId = nanoid();
  const rowCreatedId = nanoid();
  const headRowVersionId = nanoid();
  const draftRowVersionId = nanoid();
  const headEndpointId = nanoid();
  const draftEndpointId = nanoid();

  // changelog
  await prismaService.changelog.create({
    data: {
      id: headChangelogId,
    },
  });

  await prismaService.changelog.create({
    data: {
      id: draftChangelogId,
    },
  });

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
              changelogId: headChangelogId,
            },
            {
              id: draftRevisionId,
              parentId: headRevisionId,
              isDraft: true,
              changelogId: draftChangelogId,
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
      versionId: nanoid(),
      createdId: nanoid(),
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
    headChangelogId,
    draftChangelogId,
    tableId,
    tableCreatedId,
    headTableVersionId,
    draftTableVersionId,
    rowId,
    rowCreatedId,
    headRowVersionId,
    draftRowVersionId,
    headEndpointId,
    draftEndpointId,
    schemaTableVersionId,
    schemaTableCreatedId,
  };
};

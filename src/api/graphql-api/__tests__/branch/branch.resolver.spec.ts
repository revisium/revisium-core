import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const DELETE_BRANCH_MUTATION = `
  mutation DeleteBranch($data: DeleteBranchInput!) {
    deleteBranch(data: $data)
  }
`;

describe('graphql - BranchResolver', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const makeProjectPublic = async (projectId: string) => {
    await prismaService.project.update({
      where: { id: projectId },
      data: { isPublic: true },
    });
  };

  const createChildBranch = async (
    projectId: string,
    parentRevisionId: string,
  ) => {
    const childBranchId = nanoid();
    const childBranchName = `child-${nanoid()}`;
    const childHeadRevisionId = nanoid();
    const childDraftRevisionId = nanoid();

    await prismaService.branch.create({
      data: {
        id: childBranchId,
        name: childBranchName,
        isRoot: false,
        projectId,
        revisions: {
          createMany: {
            data: [
              {
                id: childHeadRevisionId,
                isHead: true,
                isStart: true,
                parentId: parentRevisionId,
              },
              {
                id: childDraftRevisionId,
                parentId: childHeadRevisionId,
                isDraft: true,
              },
            ],
          },
        },
      },
    });

    return {
      childBranchId,
      childBranchName,
      childHeadRevisionId,
      childDraftRevisionId,
    };
  };

  const graphqlRequest = (token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  describe('deleteBranch mutation', () => {
    let preparedData: PrepareDataReturnType;
    let childBranch: Awaited<ReturnType<typeof createChildBranch>>;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      childBranch = await createChildBranch(
        preparedData.project.projectId,
        preparedData.project.headRevisionId,
      );
    });

    it('owner can delete non-root branch', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.data.deleteBranch).toBe(true);

      const deletedBranch = await prismaService.branch.findUnique({
        where: { id: childBranch.childBranchId },
      });
      expect(deletedBranch).toBeNull();
    });

    it('owner cannot delete root branch', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: preparedData.project.branchName,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'Cannot delete the root branch',
      );
    });

    it('another owner cannot delete branch (private project)', async () => {
      const response = await graphqlRequest(preparedData.anotherOwner.token)
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'You are not allowed to read on Project',
      );
    });

    it('cannot delete branch without authentication', async () => {
      const response = await graphqlRequest()
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });
  });

  describe('deleteBranch mutation - Public Project', () => {
    let preparedData: PrepareDataReturnType;
    let childBranch: Awaited<ReturnType<typeof createChildBranch>>;

    beforeEach(async () => {
      preparedData = await prepareData(app);
      childBranch = await createChildBranch(
        preparedData.project.projectId,
        preparedData.project.headRevisionId,
      );
      await makeProjectPublic(preparedData.project.projectId);
    });

    it('unauthenticated user cannot delete branch (public project)', async () => {
      const response = await graphqlRequest()
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('another owner cannot delete branch (no delete permission on public project)', async () => {
      const response = await graphqlRequest(preparedData.anotherOwner.token)
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain(
        'You are not allowed to delete on Branch',
      );
    });

    it('owner can still delete branch (public project)', async () => {
      const response = await graphqlRequest(preparedData.owner.token)
        .send({
          query: DELETE_BRANCH_MUTATION,
          variables: {
            data: {
              organizationId: preparedData.project.organizationId,
              projectName: preparedData.project.projectName,
              branchName: childBranch.childBranchName,
            },
          },
        })
        .expect(200);

      expect(response.body.data.deleteBranch).toBe(true);
    });
  });

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    prismaService = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });
});

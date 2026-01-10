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

describe('restapi - BranchByNameController', () => {
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

  describe('DELETE /organization/:organizationId/projects/:projectName/branches/:branchName', () => {
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
      const response = await request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200);

      expect(response.body).toEqual({});

      const deletedBranch = await prismaService.branch.findUnique({
        where: { id: childBranch.childBranchId },
      });
      expect(deletedBranch).toBeNull();
    });

    it('owner cannot delete root branch', async () => {
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            preparedData.project.branchName,
          ),
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(400)
        .expect(/Cannot delete the root branch/);
    });

    it('another owner cannot delete branch (private project)', async () => {
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to read on Project/);
    });

    it('cannot delete branch without authentication', async () => {
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .expect(401);
    });

    it('should return 400 for non-existent branch', async () => {
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            'non-existent-branch',
          ),
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(400)
        .expect(/A branch with this name does not exist/);
    });

    function getDeleteBranchUrl(
      organizationId: string,
      projectName: string,
      branchName: string,
    ) {
      return `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}`;
    }
  });

  describe('DELETE /...branches/:branchName - Public Project', () => {
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
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .expect(401);
    });

    it('another owner cannot delete branch (no delete permission on public project)', async () => {
      return request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .set('Authorization', `Bearer ${preparedData.anotherOwner.token}`)
        .expect(403)
        .expect(/You are not allowed to delete on Branch/);
    });

    it('owner can still delete branch (public project)', async () => {
      const response = await request(app.getHttpServer())
        .delete(
          getDeleteBranchUrl(
            preparedData.project.organizationId,
            preparedData.project.projectName,
            childBranch.childBranchName,
          ),
        )
        .set('Authorization', `Bearer ${preparedData.owner.token}`)
        .expect(200);

      expect(response.body).toEqual({});
    });

    function getDeleteBranchUrl(
      organizationId: string,
      projectName: string,
      branchName: string,
    ) {
      return `/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}`;
    }
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

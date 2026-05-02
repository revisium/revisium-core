import { QueryBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { FindProjectIdentityQuery } from 'src/features/project/queries/impl';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { createProjectCommandTestKit } from 'src/testing/kit/create-project-command-test-kit';
import { prepareProject } from 'src/testing/utils/prepareProject';

describe('FindProjectIdentityHandler', () => {
  describe('by organizationId + projectName', () => {
    it('returns identity for an existing project', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns null for an unknown project', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({
        organizationId: project.organizationId,
        projectName: 'no-such-project',
      });

      expect(result).toBeNull();
    });

    it('returns null after the project is soft-deleted', async () => {
      const project = await prepareProject(moduleFixture);
      await prismaService.project.update({
        where: { id: project.projectId },
        data: { isDeleted: true },
      });

      const result = await execute({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });

      expect(result).toBeNull();
    });
  });

  describe('by projectId', () => {
    it('returns identity for an existing project', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({ projectId: project.projectId });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns null for an unknown projectId', async () => {
      const result = await execute({ projectId: 'unknown-project-id' });

      expect(result).toBeNull();
    });

    it('returns null after the project is soft-deleted', async () => {
      const project = await prepareProject(moduleFixture);
      await prismaService.project.update({
        where: { id: project.projectId },
        data: { isDeleted: true },
      });

      const result = await execute({ projectId: project.projectId });

      expect(result).toBeNull();
    });
  });

  describe('by revisionId', () => {
    it('returns identity for a head revision', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({ revisionId: project.headRevisionId });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns identity for a draft revision', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({ revisionId: project.draftRevisionId });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns null for an unknown revisionId', async () => {
      const result = await execute({ revisionId: 'unknown-revision-id' });

      expect(result).toBeNull();
    });

    it('returns null when the project is soft-deleted', async () => {
      const project = await prepareProject(moduleFixture);
      await prismaService.project.update({
        where: { id: project.projectId },
        data: { isDeleted: true },
      });

      const result = await execute({ revisionId: project.draftRevisionId });

      expect(result).toBeNull();
    });
  });

  describe('by endpointId', () => {
    it('returns identity for a head endpoint', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({ endpointId: project.headEndpointId });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns identity for a draft endpoint', async () => {
      const project = await prepareProject(moduleFixture);

      const result = await execute({ endpointId: project.draftEndpointId });

      expect(result).toEqual({
        organizationId: project.organizationId,
        projectName: project.projectName,
      });
    });

    it('returns null for an unknown endpointId', async () => {
      const result = await execute({ endpointId: 'unknown-endpoint-id' });

      expect(result).toBeNull();
    });

    it('returns null when the project is soft-deleted', async () => {
      const project = await prepareProject(moduleFixture);
      await prismaService.project.update({
        where: { id: project.projectId },
        data: { isDeleted: true },
      });

      const result = await execute({ endpointId: project.headEndpointId });

      expect(result).toBeNull();
    });
  });

  describe('precedence and edge cases', () => {
    it('prefers organizationId+projectName over revisionId when both are given', async () => {
      const a = await prepareProject(moduleFixture);
      const b = await prepareProject(moduleFixture);

      const result = await execute({
        organizationId: a.organizationId,
        projectName: a.projectName,
        revisionId: b.draftRevisionId,
      });

      expect(result).toEqual({
        organizationId: a.organizationId,
        projectName: a.projectName,
      });
    });

    it('prefers revisionId over endpointId when both are given', async () => {
      const a = await prepareProject(moduleFixture);
      const b = await prepareProject(moduleFixture);

      const result = await execute({
        revisionId: a.draftRevisionId,
        endpointId: b.headEndpointId,
      });

      expect(result).toEqual({
        organizationId: a.organizationId,
        projectName: a.projectName,
      });
    });

    it('prefers endpointId over projectId when both are given', async () => {
      const a = await prepareProject(moduleFixture);
      const b = await prepareProject(moduleFixture);

      const result = await execute({
        endpointId: a.headEndpointId,
        projectId: b.projectId,
      });

      expect(result).toEqual({
        organizationId: a.organizationId,
        projectName: a.projectName,
      });
    });

    it('matches CheckProjectPermissionHandler precedence (orgName → revisionId → endpointId → projectId)', async () => {
      const a = await prepareProject(moduleFixture);
      const b = await prepareProject(moduleFixture);
      const c = await prepareProject(moduleFixture);
      const d = await prepareProject(moduleFixture);

      const result = await execute({
        organizationId: a.organizationId,
        projectName: a.projectName,
        revisionId: b.draftRevisionId,
        endpointId: c.headEndpointId,
        projectId: d.projectId,
      });

      expect(result).toEqual({
        organizationId: a.organizationId,
        projectName: a.projectName,
      });
    });

    it('returns null when no identifying fields are provided', async () => {
      const result = await execute({});

      expect(result).toBeNull();
    });
  });

  let prismaService: PrismaService;
  let queryBus: QueryBus;
  let moduleFixture: TestingModule;
  let closeModule: () => Promise<void>;

  function execute(data: FindProjectIdentityQuery['data']) {
    return queryBus.execute(new FindProjectIdentityQuery(data));
  }

  beforeAll(async () => {
    const kit = await createProjectCommandTestKit();
    moduleFixture = kit.module;
    prismaService = kit.prismaService;
    queryBus = kit.module.get(QueryBus);
    closeModule = kit.close;
  });

  afterAll(async () => {
    await closeModule();
  });
});

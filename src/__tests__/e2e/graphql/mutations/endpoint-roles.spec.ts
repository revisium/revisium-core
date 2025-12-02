import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareDataWithRoles,
  PrepareDataWithRolesReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  gqlQuery,
  gqlQueryExpectError,
} from 'src/__tests__/e2e/shared';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('graphql - endpoint mutations (role-based)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    app = await createFreshTestApp();
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createEndpoint', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
      await prismaService.endpoint.deleteMany({
        where: {
          revisionId: fixture.project.draftRevisionId,
        },
      });
    });

    const getMutation = (revisionId: string) => ({
      query: gql`
        mutation createEndpoint($data: CreateEndpointInput!) {
          createEndpoint(data: $data) {
            id
            type
          }
        }
      `,
      variables: {
        data: {
          revisionId,
          type: 'GRAPHQL',
        },
      },
    });

    it('owner can create endpoint', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(fixture.project.draftRevisionId),
      });
      expect(result.createEndpoint).toBeDefined();
      expect(result.createEndpoint.type).toBe('GRAPHQL');
    });

    it('developer can create endpoint', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.developer.token,
        ...getMutation(fixture.project.draftRevisionId),
      });
      expect(result.createEndpoint).toBeDefined();
      expect(result.createEndpoint.type).toBe('GRAPHQL');
    });

    it('editor cannot create endpoint', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(fixture.project.draftRevisionId),
        },
        /You are not allowed to create on Endpoint/,
      );
    });

    it('reader cannot create endpoint', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(fixture.project.draftRevisionId),
        },
        /You are not allowed to create on Endpoint/,
      );
    });
  });

  describe('deleteEndpoint', () => {
    let fixture: PrepareDataWithRolesReturnType;

    beforeEach(async () => {
      fixture = await prepareDataWithRoles(app);
    });

    const getMutation = (endpointId: string) => ({
      query: gql`
        mutation deleteEndpoint($data: DeleteEndpointInput!) {
          deleteEndpoint(data: $data)
        }
      `,
      variables: {
        data: { endpointId },
      },
    });

    it('owner can delete endpoint', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getMutation(fixture.project.draftEndpointId),
      });
      expect(result.deleteEndpoint).toBe(true);
    });

    it('developer can delete endpoint', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.developer.token,
        ...getMutation(fixture.project.draftEndpointId),
      });
      expect(result.deleteEndpoint).toBe(true);
    });

    it('editor cannot delete endpoint', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.editor.token,
          ...getMutation(fixture.project.draftEndpointId),
        },
        /You are not allowed to delete on Endpoint/,
      );
    });

    it('reader cannot delete endpoint', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.reader.token,
          ...getMutation(fixture.project.draftEndpointId),
        },
        /You are not allowed to delete on Endpoint/,
      );
    });
  });
});

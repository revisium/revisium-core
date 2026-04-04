import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { graphqlQuery, graphqlQueryError } from 'src/__tests__/utils/queryTest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('graphql - organization', () => {
  let app: INestApplication;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('organization query', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can query their organization', async () => {
      const result = await graphqlQuery({
        ...getQuery(preparedData.project.organizationId),
        app,
        token: preparedData.owner.token,
      });

      expect(result.organization.id).toBe(preparedData.project.organizationId);
    });

    it('owner can query organization with userOrganization field', async () => {
      const result = await graphqlQuery({
        ...getQueryWithUserOrganization(preparedData.project.organizationId),
        app,
        token: preparedData.owner.token,
      });

      expect(result.organization.id).toBe(preparedData.project.organizationId);
      expect(result.organization.userOrganization).not.toBeNull();
    });

    it('another owner cannot query organization they do not belong to', async () => {
      return graphqlQueryError({
        ...getQuery(preparedData.project.organizationId),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on User/,
      });
    });

    it('should throw error without authentication', async () => {
      return graphqlQueryError({
        ...getQuery(preparedData.project.organizationId),
        app,
        token: undefined,
        error: /Unauthorized/,
      });
    });

    function getQuery(organizationId: string) {
      return {
        query: gql`
          query organization($data: GetOrganizationInput!) {
            organization(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            organizationId,
          },
        },
      };
    }

    function getQueryWithUserOrganization(organizationId: string) {
      return {
        query: gql`
          query organization($data: GetOrganizationInput!) {
            organization(data: $data) {
              id
              userOrganization {
                id
              }
            }
          }
        `,
        variables: {
          data: {
            organizationId,
          },
        },
      };
    }
  });
});

import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import {
  createFreshTestApp,
  gqlQuery,
  gqlQueryExpectError,
} from 'src/__tests__/e2e/shared';

describe('graphql - auth mutations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('login', () => {
    let fixture: PrepareDataReturnType;

    beforeEach(async () => {
      fixture = await prepareData(app);
    });

    const getMutation = (emailOrUsername: string, password: string) => ({
      query: gql`
        mutation login($data: LoginInput!) {
          login(data: $data) {
            accessToken
          }
        }
      `,
      variables: {
        data: { emailOrUsername, password },
      },
    });

    it('user can login with username', async () => {
      const result = await gqlQuery({
        app,
        ...getMutation(fixture.owner.user.username!, 'password'),
      });

      expect(result.login).toBeDefined();
      expect(result.login.accessToken).toBeDefined();
      expect(typeof result.login.accessToken).toBe('string');
    });

    it('login fails with wrong password', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation(fixture.owner.user.username!, 'wrong-password'),
        },
        /Invalid password/,
      );
    });

    it('login fails with non-existent user', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getMutation('non-existent-user', 'password'),
        },
        /User does not exist/,
      );
    });
  });

  describe('signUp', () => {
    const getMutation = (
      username: string,
      email: string,
      password: string,
    ) => ({
      query: gql`
        mutation signUp($data: SignUpInput!) {
          signUp(data: $data)
        }
      `,
      variables: {
        data: { username, email, password },
      },
    });

    it('user can sign up', async () => {
      const uniqueUsername = `test-user-${Date.now()}`;
      const uniqueEmail = `test-${Date.now()}@example.com`;

      const result = await gqlQuery({
        app,
        ...getMutation(uniqueUsername, uniqueEmail, 'securePassword123'),
      });

      expect(result.signUp).toBe(true);
    });

    it('signup fails with existing username', async () => {
      const fixture = await prepareData(app);

      await gqlQueryExpectError(
        {
          app,
          ...getMutation(
            fixture.owner.user.username!,
            'new-email@example.com',
            'password',
          ),
        },
        /already exists/,
      );
    });
  });
});

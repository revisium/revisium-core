import { validate } from 'class-validator';
import { LoginInput } from 'src/api/graphql-api/auth/inputs/login.input';
import { LoginDto } from 'src/api/rest-api/auth/dto/login.dto';

type LoginCredentialClass = typeof LoginInput | typeof LoginDto;

const loginCredentialTypes: Array<[string, LoginCredentialClass]> = [
  ['GraphQL LoginInput', LoginInput],
  ['REST LoginDto', LoginDto],
];

describe('login credential validation', () => {
  it.each(loginCredentialTypes)(
    'allows an empty password for %s so no-auth mode can issue a JWT',
    async (_name, CredentialType) => {
      const data = Object.assign(new CredentialType(), {
        emailOrUsername: 'admin',
        password: '',
      });

      await expect(validate(data)).resolves.toHaveLength(0);
    },
  );

  it.each(loginCredentialTypes)(
    'still requires a non-empty emailOrUsername for %s',
    async (_name, CredentialType) => {
      const data = Object.assign(new CredentialType(), {
        emailOrUsername: '',
        password: '',
      });

      const errors = await validate(data);

      expect(errors.map((error) => error.property)).toContain(
        'emailOrUsername',
      );
    },
  );

  it.each(loginCredentialTypes)(
    'still requires password to be a string for %s',
    async (_name, CredentialType) => {
      const data = Object.assign(new CredentialType(), {
        emailOrUsername: 'admin',
        password: 123,
      });

      const errors = await validate(data);

      expect(errors.map((error) => error.property)).toContain('password');
    },
  );
});

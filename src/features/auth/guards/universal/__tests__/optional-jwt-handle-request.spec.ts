import { handleOptionalJwtRequest } from '../optional-jwt-handle-request';

describe('handleOptionalJwtRequest', () => {
  it.each([false, null, undefined])(
    'returns undefined when Passport provides no user (%p)',
    (user) => {
      expect(handleOptionalJwtRequest(undefined, user)).toBeUndefined();
    },
  );

  it('returns the authenticated user', () => {
    const user = { userId: 'user-id' };

    expect(handleOptionalJwtRequest(undefined, user)).toBe(user);
  });

  it('propagates authentication errors', () => {
    const error = new Error('strategy failure');

    expect(() => handleOptionalJwtRequest(error, false)).toThrow(error);
  });
});

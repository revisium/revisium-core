import { UnauthorizedException } from '@nestjs/common';

export function handleOptionalJwtRequest<TUser>(
  err: unknown,
  user: TUser | false | null | undefined,
): TUser {
  if (err) {
    throw err;
  }
  if (!user) {
    throw new UnauthorizedException();
  }
  return user;
}

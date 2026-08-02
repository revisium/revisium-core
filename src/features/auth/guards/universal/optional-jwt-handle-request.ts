export function handleOptionalJwtRequest<TUser>(
  err: unknown,
  user: TUser | false | null | undefined,
): TUser | undefined {
  if (err) {
    throw err;
  }
  if (!user) {
    return undefined;
  }
  return user;
}

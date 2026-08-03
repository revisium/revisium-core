/**
 * Marker left on a request whose JWT-family credentials were presented and
 * refused: `UniversalAuthService.authenticateRequest` classified it as `'jwt'`
 * (an `Authorization` header, a `rev_at` cookie, or `rev_session=1`), yet
 * Passport attached no user.
 *
 * Optional auth guards let such a request continue anonymously so public
 * resources stay readable (github.com/revisium/qa#55). On a resource that does
 * deny access, the permission guard uses this marker to answer `401` instead
 * of `403`: the caller is not "not allowed", it is "no longer authenticated"
 * and should refresh its access token and retry. `rev_at` lives 30 minutes
 * while `rev_session` lives 7 days (ADR-0045), so a logged-in browser spends
 * most of its idle time in exactly this state.
 *
 * The marker is deliberately absent whenever a user did materialise — an API
 * key or JWT with valid credentials but insufficient rights must keep
 * answering `403`, because refreshing a token would not help.
 *
 * Callers must name this type on the request they hand in. TypeScript's
 * weak-type check then rejects an unrelated object — a GraphQL execution
 * context passed instead of its `req`, say — which would otherwise read as a
 * silent `false` and quietly send every denial back to `403`.
 */
export interface RequestWithRejectedCredentials {
  rejectedCredentials?: boolean;
}

export function markRejectedCredentials(
  request: RequestWithRejectedCredentials,
): void {
  request.rejectedCredentials = true;
}

export function hasRejectedCredentials(
  request: RequestWithRejectedCredentials | undefined,
): boolean {
  return request?.rejectedCredentials === true;
}

export interface LicensePayload {
  sub: string; // organization ID or wildcard "*"
  features: string[]; // e.g. ["billing", "sso", "audit", "advanced_rbac"]
  exp: number; // expiry timestamp (Unix seconds)
  iat: number; // issued at
  iss: string; // "revisium-licensing"
}

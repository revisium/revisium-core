export type AuthMethod =
  | 'jwt'
  | 'personal_key'
  | 'service_key'
  | 'internal_key';

export type IApiKeyScope = {
  organizationId: string | null;
  projectIds: string[];
  branchNames: string[];
  tableIds: string[];
};

export type IAuthUser = {
  userId: string;
  email: string;
  authMethod?: AuthMethod;
  apiKeyId?: string;
  serviceId?: string;
  apiKeyScope?: IApiKeyScope;
};

export type IOptionalAuthUser = IAuthUser | undefined;

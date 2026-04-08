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

export interface ICaslRule {
  action: string | string[];
  subject: string | string[];
  conditions?: Record<string, unknown>;
  fields?: string[];
  inverted?: boolean;
}

export type IAuthUser = {
  userId: string;
  email: string;
  authMethod?: AuthMethod;
  apiKeyId?: string;
  serviceId?: string;
  apiKeyScope?: IApiKeyScope;
  apiKeyReadOnly?: boolean;
  serviceKeyPermissions?: { rules: ICaslRule[] };
};

export type IOptionalAuthUser = IAuthUser | undefined;

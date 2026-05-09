import { GetApiKeyByIdQueryReturnType } from 'src/features/api-key/queries/impl';
import { ApiKeyModel } from 'src/api/rest-api/api-key/model/api-key.model';

type ApiKeyLike = Pick<
  GetApiKeyByIdQueryReturnType,
  | 'id'
  | 'prefix'
  | 'type'
  | 'name'
  | 'organizationId'
  | 'projectIds'
  | 'branchNames'
  | 'tableIds'
  | 'readOnly'
  | 'allowedIps'
  | 'permissions'
  | 'expiresAt'
  | 'lastUsedAt'
  | 'createdAt'
  | 'revokedAt'
>;

export const toApiKeyModel = (apiKey: ApiKeyLike): ApiKeyModel => ({
  id: apiKey.id,
  prefix: apiKey.prefix,
  type: apiKey.type,
  name: apiKey.name,
  organizationId: apiKey.organizationId ?? null,
  projectIds: apiKey.projectIds,
  branchNames: apiKey.branchNames,
  tableIds: apiKey.tableIds,
  readOnly: apiKey.readOnly,
  allowedIps: apiKey.allowedIps,
  permissions: apiKey.permissions ?? null,
  expiresAt: apiKey.expiresAt ?? null,
  lastUsedAt: apiKey.lastUsedAt ?? null,
  createdAt: apiKey.createdAt,
  revokedAt: apiKey.revokedAt ?? null,
});

import {
  GetApiKeyByIdHandler,
  GetApiKeysHandler,
} from 'src/features/api-key/queries/handlers';

export const API_KEY_QUERIES = [GetApiKeysHandler, GetApiKeyByIdHandler];

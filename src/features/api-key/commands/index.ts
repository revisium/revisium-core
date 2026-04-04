import {
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
  RotateApiKeyHandler,
} from 'src/features/api-key/commands/handlers';

export const API_KEY_COMMANDS = [
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
  RotateApiKeyHandler,
];

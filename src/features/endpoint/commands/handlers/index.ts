import { ApiCreateEndpointHandler } from 'src/features/endpoint/commands/handlers/api-create-endpoint.handler';
import { CreateEndpointHandler } from 'src/features/endpoint/commands/handlers/create-endpoint.handler';
import { DeleteEndpointHandler } from 'src/features/endpoint/commands/handlers/delete-endpoint.handler';

export const ENDPOINT_COMMANDS = [
  CreateEndpointHandler,
  ApiCreateEndpointHandler,
  DeleteEndpointHandler,
];

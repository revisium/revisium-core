import { ApiCreateEndpointHandler } from 'src/endpoint/commands/handlers/api-create-endpoint.handler';
import { CreateEndpointHandler } from 'src/endpoint/commands/handlers/create-endpoint.handler';
import { DeleteEndpointHandler } from 'src/endpoint/commands/handlers/delete-endpoint.handler';

export const ENDPOINT_COMMANDS = [
  CreateEndpointHandler,
  ApiCreateEndpointHandler,
  DeleteEndpointHandler,
];

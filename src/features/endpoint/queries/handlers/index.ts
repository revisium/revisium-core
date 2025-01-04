import { GetCreatedEndpointHandler } from 'src/features/endpoint/queries/handlers/get-created-endpoint.handler';
import { GetRevisionByEndpointIdHandler } from 'src/features/endpoint/queries/handlers/get-revision-by-endpoint-id.handler';

export const ENDPOINT_QUERIES = [
  GetCreatedEndpointHandler,
  GetRevisionByEndpointIdHandler,
];

import { GetCreatedEndpointHandler } from 'src/features/endpoint/queries/handlers/get-created-endpoint.handler';
import { GetEndpointRelativesHandler } from 'src/features/endpoint/queries/handlers/get-endpoint-relatives.handler';
import { GetRevisionByEndpointIdHandler } from 'src/features/endpoint/queries/handlers/get-revision-by-endpoint-id.handler';

export const ENDPOINT_QUERIES = [
  GetCreatedEndpointHandler,
  GetRevisionByEndpointIdHandler,
  GetEndpointRelativesHandler,
];

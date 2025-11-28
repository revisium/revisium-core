import { ObjectType } from '@nestjs/graphql';
import { EndpointModel } from 'src/api/graphql-api/endpoint/model/endpoint.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class EndpointsConnection extends Paginated(EndpointModel) {}

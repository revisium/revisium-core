import { Field, ObjectType } from '@nestjs/graphql';
import { RevisionModel } from 'src/graphql-api/revision/model/revision.model';

export enum EndpointType {
  GRAPHQL = 'GRAPHQL',
  REST_API = 'REST_API',
}

@ObjectType()
export class EndpointModel {
  @Field()
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => RevisionModel)
  revision: RevisionModel;

  @Field(() => EndpointType)
  type: EndpointType;
}

import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

export enum EndpointType {
  GRAPHQL = 'GRAPHQL',
  REST_API = 'REST_API',
}

@ObjectType()
export class EndpointModel {
  @Field()
  id: string;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field()
  revisionId: string;

  @Field(() => RevisionModel)
  revision: Relation<RevisionModel>;

  @Field(() => EndpointType)
  type: EndpointType;
}

import { Field, InputType } from '@nestjs/graphql';
import { EndpointType } from 'src/api/graphql-api/endpoint/model';

@InputType()
export class CreateEndpointInput {
  @Field()
  revisionId: string;

  @Field(() => EndpointType)
  type: EndpointType;
}

import { Field, InputType, Int } from '@nestjs/graphql';
import { EndpointType } from 'src/api/graphql-api/endpoint/model';

@InputType()
export class GetProjectEndpointsInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field({ nullable: true })
  branchId?: string;

  @Field(() => EndpointType, { nullable: true })
  type?: EndpointType;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}

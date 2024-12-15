import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetEndpointInput {
  @Field()
  id: string;
}

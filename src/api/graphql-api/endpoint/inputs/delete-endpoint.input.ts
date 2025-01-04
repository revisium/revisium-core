import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteEndpointInput {
  @Field()
  endpointId: string;
}

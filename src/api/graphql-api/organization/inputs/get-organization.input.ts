import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetOrganizationInput {
  @Field()
  organizationId: string;
}

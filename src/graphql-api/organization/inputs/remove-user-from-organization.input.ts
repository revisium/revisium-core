import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserFromOrganizationInput {
  @Field() organizationId: string;

  @Field() userId: string;
}

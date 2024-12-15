import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveUserFromProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  userId: string;
}

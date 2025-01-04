import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RevertChangesInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  branchName: string;
}

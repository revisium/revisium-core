import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteBranchInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  branchName: string;
}

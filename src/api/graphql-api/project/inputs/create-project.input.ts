import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field({ nullable: true })
  branchName?: string;

  @Field({ nullable: true })
  fromRevisionId?: string;
}

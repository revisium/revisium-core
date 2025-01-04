import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;
}

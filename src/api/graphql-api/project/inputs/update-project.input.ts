import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field(() => Boolean)
  isPublic: boolean;
}

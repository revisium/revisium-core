import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetRevisionChangesInput {
  @Field()
  revisionId: string;

  @Field({ nullable: true })
  compareWithRevisionId?: string;

  @Field({ nullable: true, defaultValue: false })
  includeSystem?: boolean;
}

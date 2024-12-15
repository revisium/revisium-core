import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetRevisionInput {
  @Field()
  revisionId: string;
}

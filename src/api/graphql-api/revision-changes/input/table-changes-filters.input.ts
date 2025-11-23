import { Field, InputType } from '@nestjs/graphql';
import { ChangeTypeEnum } from '../model/enums.model';

@InputType()
export class TableChangesFiltersInput {
  @Field(() => [ChangeTypeEnum], { nullable: true })
  changeTypes?: ChangeTypeEnum[];

  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  withSchemaMigrations?: boolean;

  @Field({ nullable: true, defaultValue: false })
  includeSystem?: boolean;
}

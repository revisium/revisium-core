import { Field, InputType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { ChangeTypeEnum, ChangeSourceEnum } from '../model/enums.model';

@InputType()
export class RowChangesFiltersInput {
  @Field({ nullable: true })
  tableId?: string;

  @Field({ nullable: true })
  tableCreatedId?: string;

  @Field(() => [ChangeTypeEnum], { nullable: true })
  changeTypes?: ChangeTypeEnum[];

  @Field(() => [ChangeSourceEnum], { nullable: true })
  changeSources?: ChangeSourceEnum[];

  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  fieldPath?: string;

  @Field(() => JSONResolver, { nullable: true })
  fieldValue?: unknown;

  @Field({ nullable: true })
  affectedBySchema?: boolean;

  @Field({ nullable: true, defaultValue: false })
  includeSystem?: boolean;
}

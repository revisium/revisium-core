import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ChangeTypeEnum } from './enums.model';

@ObjectType()
export class ViewChangeModel {
  @Field()
  viewId: string;

  @Field()
  viewName: string;

  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum;

  @Field(() => String, { nullable: true })
  oldViewName?: string;
}

@ObjectType()
export class ViewsChangeDetailModel {
  @Field()
  hasChanges: boolean;

  @Field(() => [ViewChangeModel])
  changes: ViewChangeModel[];

  @Field(() => Int)
  addedCount: number;

  @Field(() => Int)
  modifiedCount: number;

  @Field(() => Int)
  removedCount: number;

  @Field(() => Int)
  renamedCount: number;
}

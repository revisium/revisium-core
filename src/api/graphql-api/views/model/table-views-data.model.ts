import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ViewModel } from './view.model';

@ObjectType()
export class TableViewsDataModel {
  @Field(() => Int)
  version: number;

  @Field()
  defaultViewId: string;

  @Field(() => [ViewModel])
  views: ViewModel[];
}

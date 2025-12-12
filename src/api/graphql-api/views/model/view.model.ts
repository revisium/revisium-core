import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { ViewColumnModel } from './view-column.model';
import { ViewSortModel } from './view-sort.model';

@ObjectType()
export class ViewModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [ViewColumnModel], { nullable: true })
  columns?: ViewColumnModel[] | null;

  @Field(() => JSONResolver, { nullable: true })
  filters?: Record<string, unknown>;

  @Field(() => [ViewSortModel], { nullable: true })
  sorts?: ViewSortModel[];

  @Field({ nullable: true })
  search?: string;
}

import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { RowChangeDetailTypeEnum } from './enums.model';

@ObjectType()
export class FieldMoveModel {
  @Field()
  from: string;

  @Field()
  to: string;
}

@ObjectType()
export class FieldChangeModel {
  @Field()
  fieldPath: string;

  @Field(() => JSONResolver, { nullable: true })
  oldValue: unknown | null;

  @Field(() => JSONResolver, { nullable: true })
  newValue: unknown | null;

  @Field(() => RowChangeDetailTypeEnum)
  changeType: RowChangeDetailTypeEnum;

  @Field(() => String, { nullable: true })
  movedFrom?: string;
}

import { createUnionType, Field, Int, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { Prisma } from 'src/__generated__/client';
import { PageInfo } from 'src/api/graphql-api/share/model/paginated.model';
import { ChangeTypeEnum } from './enums.model';
import { FieldChangeModel } from './field-change.model';

@ObjectType()
export class RowChangeRowModel {
  @Field()
  id: string;

  @Field()
  createdId: string;

  @Field()
  versionId: string;

  @Field(() => JSONResolver)
  data: Prisma.JsonValue;

  @Field()
  hash: string;

  @Field()
  schemaHash: string;

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => JSONResolver)
  meta: Prisma.JsonValue;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field(() => DateTimeResolver)
  updatedAt: Date;

  @Field(() => DateTimeResolver)
  publishedAt: Date;
}

@ObjectType()
export class RowChangeTableModel {
  @Field()
  id: string;

  @Field()
  createdId: string;

  @Field()
  versionId: string;

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => Boolean)
  system: boolean;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field(() => DateTimeResolver)
  updatedAt: Date;
}

@ObjectType()
export class AddedRowChangeModel {
  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum.ADDED;

  @Field(() => RowChangeRowModel)
  row: RowChangeRowModel;

  @Field(() => RowChangeTableModel)
  table: RowChangeTableModel;

  @Field(() => [FieldChangeModel])
  fieldChanges: FieldChangeModel[];
}

@ObjectType()
export class RemovedRowChangeModel {
  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum.REMOVED;

  @Field(() => RowChangeRowModel)
  fromRow: RowChangeRowModel;

  @Field(() => RowChangeTableModel)
  fromTable: RowChangeTableModel;

  @Field(() => [FieldChangeModel])
  fieldChanges: FieldChangeModel[];
}

@ObjectType()
export class ModifiedRowChangeModel {
  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum;

  @Field(() => RowChangeRowModel)
  row: RowChangeRowModel;

  @Field(() => RowChangeRowModel)
  fromRow: RowChangeRowModel;

  @Field(() => RowChangeTableModel)
  table: RowChangeTableModel;

  @Field(() => RowChangeTableModel)
  fromTable: RowChangeTableModel;

  @Field(() => [FieldChangeModel])
  fieldChanges: FieldChangeModel[];
}

export const RowChangeUnion = createUnionType({
  name: 'RowChange',
  types: () =>
    [
      AddedRowChangeModel,
      RemovedRowChangeModel,
      ModifiedRowChangeModel,
    ] as const,
  resolveType: (value: { changeType: string }) => {
    switch (value.changeType) {
      case ChangeTypeEnum.ADDED:
        return AddedRowChangeModel;
      case ChangeTypeEnum.REMOVED:
        return RemovedRowChangeModel;
      default:
        return ModifiedRowChangeModel;
    }
  },
});

@ObjectType()
export class RowChangeEdge {
  @Field(() => String)
  cursor: string;

  @Field(() => RowChangeUnion)
  node: AddedRowChangeModel | RemovedRowChangeModel | ModifiedRowChangeModel;
}

@ObjectType()
export class RowChangesConnection {
  @Field(() => [RowChangeEdge])
  edges: RowChangeEdge[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

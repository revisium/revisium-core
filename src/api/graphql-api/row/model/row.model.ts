import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Prisma } from 'src/__generated__/client';
import { JSONResolver, DateTimeResolver } from 'graphql-scalars';
import { FormulaFieldErrorModel } from 'src/api/graphql-api/row/model/formula-field-error.model';
import { RowsConnection } from 'src/api/graphql-api/row/model/rows-connection.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

export type RowModelContext = {
  revisionId: string;
  tableId: string;
};

@ObjectType()
export class RowModel {
  @Field()
  createdId: string;

  @Field()
  id: string;

  @Field()
  versionId: string;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field(() => DateTimeResolver)
  updatedAt: Date;

  @Field(() => DateTimeResolver)
  publishedAt: Date;

  @Field(() => Boolean)
  readonly: boolean;

  @Field(() => JSONResolver)
  data: Prisma.JsonValue;

  @Field(() => [FormulaFieldErrorModel], { nullable: true })
  formulaErrors?: FormulaFieldErrorModel[];

  @Field(() => RowsConnection)
  rowForeignKeysTo: Relation<RowsConnection>;

  @Field(() => Int)
  countForeignKeysTo: number;

  @Field(() => RowsConnection)
  rowForeignKeysBy: Relation<RowsConnection>;

  context: RowModelContext;
}

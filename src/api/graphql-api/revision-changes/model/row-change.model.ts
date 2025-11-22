import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { ChangeTypeEnum, ChangeSourceEnum } from './enums.model';
import { FieldChangeModel } from './field-change.model';
import { SchemaChangeImpactModel } from './schema-change.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class RowChangeModel {
  @Field()
  rowId: string;

  @Field()
  rowCreatedId: string;

  @Field(() => String, { nullable: true })
  fromVersionId: string | null;

  @Field(() => String, { nullable: true })
  toVersionId: string | null;

  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum;

  @Field(() => ChangeSourceEnum)
  changeSource: ChangeSourceEnum;

  @Field(() => String, { nullable: true })
  oldRowId?: string;

  @Field(() => String, { nullable: true })
  newRowId?: string;

  @Field(() => JSONResolver, { nullable: true })
  fromData: unknown | null;

  @Field(() => JSONResolver, { nullable: true })
  toData: unknown | null;

  @Field(() => String, { nullable: true })
  fromHash?: string;

  @Field(() => String, { nullable: true })
  toHash?: string;

  @Field(() => String, { nullable: true })
  fromSchemaHash?: string;

  @Field(() => String, { nullable: true })
  toSchemaHash?: string;

  @Field(() => [FieldChangeModel])
  fieldChanges: FieldChangeModel[];

  @Field(() => SchemaChangeImpactModel, { nullable: true })
  schemaImpact: SchemaChangeImpactModel | null;

  @Field(() => DateTimeResolver)
  updatedAt: Date;

  @Field(() => DateTimeResolver)
  publishedAt: Date;

  @Field(() => DateTimeResolver)
  createdAt: Date;

  @Field()
  tableId: string;

  @Field()
  tableCreatedId: string;
}

@ObjectType()
export class RowChangesConnection extends Paginated(RowChangeModel) {}

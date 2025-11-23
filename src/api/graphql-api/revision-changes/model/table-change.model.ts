import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ChangeTypeEnum } from './enums.model';
import { SchemaMigrationDetailModel } from './schema-change.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class TableChangeModel {
  @Field()
  tableId: string;

  @Field()
  tableCreatedId: string;

  @Field(() => String, { nullable: true })
  fromVersionId: string | null;

  @Field(() => String, { nullable: true })
  toVersionId: string | null;

  @Field(() => ChangeTypeEnum)
  changeType: ChangeTypeEnum;

  @Field(() => String, { nullable: true })
  oldTableId?: string;

  @Field(() => String, { nullable: true })
  newTableId?: string;

  @Field(() => [SchemaMigrationDetailModel])
  schemaMigrations: SchemaMigrationDetailModel[];

  @Field(() => Int)
  rowChangesCount: number;

  @Field(() => Int)
  addedRowsCount: number;

  @Field(() => Int)
  modifiedRowsCount: number;

  @Field(() => Int)
  removedRowsCount: number;

  @Field(() => Int)
  renamedRowsCount: number;
}

@ObjectType()
export class TableChangesConnection extends Paginated(TableChangeModel) {}

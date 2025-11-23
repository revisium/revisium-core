import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { JsonPatchOpEnum, MigrationTypeEnum } from './enums.model';
import { FieldMoveModel } from './field-change.model';

@ObjectType()
export class JsonPatchOperationModel {
  @Field(() => JsonPatchOpEnum)
  op: JsonPatchOpEnum;

  @Field()
  path: string;

  @Field(() => JSONResolver, { nullable: true })
  value?: unknown;

  @Field(() => String, { nullable: true })
  from?: string;
}

@ObjectType()
export class HistoryPatchModel {
  @Field()
  hash: string;

  @Field(() => [JsonPatchOperationModel])
  patches: JsonPatchOperationModel[];
}

@ObjectType()
export class SchemaMigrationDetailModel {
  @Field(() => MigrationTypeEnum)
  migrationType: MigrationTypeEnum;

  @Field()
  migrationId: string;

  @Field(() => JSONResolver, { nullable: true })
  initialSchema?: unknown;

  @Field(() => [JsonPatchOperationModel], { nullable: true })
  patches?: JsonPatchOperationModel[];

  @Field(() => String, { nullable: true })
  oldTableId?: string;

  @Field(() => String, { nullable: true })
  newTableId?: string;

  @Field(() => [HistoryPatchModel], { nullable: true })
  historyPatches?: HistoryPatchModel[];
}

@ObjectType()
export class SchemaChangeImpactModel {
  @Field()
  schemaHashChanged: boolean;

  @Field(() => [String])
  affectedFields: string[];

  @Field()
  migrationApplied: boolean;

  @Field(() => SchemaMigrationDetailModel, { nullable: true })
  migrationDetails?: SchemaMigrationDetailModel;

  @Field(() => [String])
  addedFields: string[];

  @Field(() => [String])
  removedFields: string[];

  @Field(() => [String])
  modifiedFields: string[];

  @Field(() => [FieldMoveModel])
  movedFields: FieldMoveModel[];
}

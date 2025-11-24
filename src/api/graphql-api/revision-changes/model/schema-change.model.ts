import { Field, ObjectType } from '@nestjs/graphql';
import { JSONResolver } from 'graphql-scalars';
import { JsonPatchOpEnum, MigrationTypeEnum } from './enums.model';

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
export class SchemaFieldChangeModel {
  @Field()
  fieldPath: string;

  @Field(() => String)
  changeType: string;

  @Field(() => JSONResolver, { nullable: true })
  oldSchema?: unknown;

  @Field(() => JSONResolver, { nullable: true })
  newSchema?: unknown;

  @Field(() => String, { nullable: true })
  movedFrom?: string;

  @Field(() => String, { nullable: true })
  movedTo?: string;
}

@ObjectType()
export class SchemaChangeImpactModel {
  @Field()
  schemaHashChanged: boolean;

  @Field()
  migrationApplied: boolean;

  @Field(() => SchemaMigrationDetailModel, { nullable: true })
  migrationDetails?: SchemaMigrationDetailModel;

  @Field(() => [SchemaFieldChangeModel])
  fieldSchemaChanges: SchemaFieldChangeModel[];
}

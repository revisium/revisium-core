import { registerEnumType } from '@nestjs/graphql';

export enum ChangeTypeEnum {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  REMOVED = 'REMOVED',
  RENAMED = 'RENAMED',
  RENAMED_AND_MODIFIED = 'RENAMED_AND_MODIFIED',
}

export enum JsonPatchOpEnum {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  REPLACE = 'REPLACE',
  MOVE = 'MOVE',
  COPY = 'COPY',
}

export enum MigrationTypeEnum {
  INIT = 'INIT',
  UPDATE = 'UPDATE',
  RENAME = 'RENAME',
  REMOVE = 'REMOVE',
}

export enum RowChangeDetailTypeEnum {
  FIELD_ADDED = 'FIELD_ADDED',
  FIELD_REMOVED = 'FIELD_REMOVED',
  FIELD_MODIFIED = 'FIELD_MODIFIED',
  FIELD_MOVED = 'FIELD_MOVED',
}

registerEnumType(ChangeTypeEnum, { name: 'ChangeType' });
registerEnumType(JsonPatchOpEnum, { name: 'JsonPatchOp' });
registerEnumType(MigrationTypeEnum, { name: 'MigrationType' });
registerEnumType(RowChangeDetailTypeEnum, { name: 'RowChangeDetailType' });

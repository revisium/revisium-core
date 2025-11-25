export enum ChangeType {
  Added = 'ADDED',
  Modified = 'MODIFIED',
  Removed = 'REMOVED',
  Renamed = 'RENAMED',
  RenamedAndModified = 'RENAMED_AND_MODIFIED',
}

export enum JsonPatchOp {
  Add = 'ADD',
  Remove = 'REMOVE',
  Replace = 'REPLACE',
  Move = 'MOVE',
  Copy = 'COPY',
}

export enum MigrationType {
  Init = 'INIT',
  Update = 'UPDATE',
  Rename = 'RENAME',
  Remove = 'REMOVE',
}

export enum RowChangeDetailType {
  FieldAdded = 'FIELD_ADDED',
  FieldRemoved = 'FIELD_REMOVED',
  FieldModified = 'FIELD_MODIFIED',
  FieldMoved = 'FIELD_MOVED',
}

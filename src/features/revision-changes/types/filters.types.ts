import { ChangeType, ChangeSource } from './enums';

export interface TableChangesFilters {
  changeTypes?: ChangeType[];
  search?: string;
  withSchemaMigrations?: boolean;
  includeSystem?: boolean;
}

export interface RowChangesFilters {
  tableId?: string;
  changeTypes?: ChangeType[];
  changeSources?: ChangeSource[];
  search?: string;
  fieldPath?: string;
  fieldValue?: unknown;
  affectedBySchema?: boolean;
  includeSystem?: boolean;
}

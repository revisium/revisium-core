import { ChangeType } from './enums';

export interface TableChangesFilters {
  changeTypes?: ChangeType[];
  search?: string;
  withSchemaMigrations?: boolean;
  includeSystem?: boolean;
}

export interface RowChangesFilters {
  tableId?: string;
  changeTypes?: ChangeType[];
  search?: string;
  includeSystem?: boolean;
}

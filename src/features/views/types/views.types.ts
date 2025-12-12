export interface ViewColumn {
  field: string;
  width?: number;
}

export interface ViewFilterCondition {
  field: string;
  operator: string;
  value?: unknown;
}

export interface ViewFilterGroup {
  logic?: 'and' | 'or';
  conditions?: ViewFilterCondition[];
  groups?: ViewFilterGroup[];
}

export interface ViewSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface View {
  id: string;
  name: string;
  description?: string;
  columns?: ViewColumn[] | null;
  filters?: ViewFilterGroup;
  sorts?: ViewSort[];
  search?: string;
}

export interface TableViewsData {
  version: number;
  defaultViewId: string;
  views: View[];
}

export const DEFAULT_VIEW_ID = 'default';
export const CURRENT_VIEWS_VERSION = 1;

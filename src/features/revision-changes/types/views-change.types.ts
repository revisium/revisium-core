import { ChangeType } from './enums';

export interface ViewChange {
  viewId: string;
  viewName: string;
  changeType: ChangeType;
  oldViewName?: string;
}

export interface ViewsChangeDetail {
  hasChanges: boolean;
  changes: ViewChange[];
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  renamedCount: number;
}

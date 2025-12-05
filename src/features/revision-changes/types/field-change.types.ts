import { RowChangeDetailType } from './enums';

export interface FieldMove {
  from: string;
  to: string;
}

export interface FieldChange {
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: RowChangeDetailType;
  movedFrom?: string;
}

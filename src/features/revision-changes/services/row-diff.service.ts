import { Injectable } from '@nestjs/common';
import { computeValueDiff } from '@revisium/schema-toolkit/lib';
import {
  FieldChangeType,
  FieldChange as SchemaToolkitFieldChange,
} from '@revisium/schema-toolkit/types';
import { FieldChange, RowChangeDetailType } from '../types';

const CHANGE_TYPE_MAP: Record<FieldChangeType, RowChangeDetailType> = {
  [FieldChangeType.Added]: RowChangeDetailType.FieldAdded,
  [FieldChangeType.Removed]: RowChangeDetailType.FieldRemoved,
  [FieldChangeType.Modified]: RowChangeDetailType.FieldModified,
};

@Injectable()
export class RowDiffService {
  public analyzeFieldChanges(
    fromData: unknown,
    toData: unknown,
  ): FieldChange[] {
    const changes = computeValueDiff(fromData, toData);
    return changes.map(this.mapToFieldChange);
  }

  private mapToFieldChange(change: SchemaToolkitFieldChange): FieldChange {
    return {
      fieldPath: change.path,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changeType: CHANGE_TYPE_MAP[change.changeType],
    };
  }
}

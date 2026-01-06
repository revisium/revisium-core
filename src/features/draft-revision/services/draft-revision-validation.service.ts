import { BadRequestException, Injectable } from '@nestjs/common';
import { validateRowId } from 'src/features/share/utils/validateUrlLikeId/validateRowId';
import { validateTableId } from 'src/features/share/utils/validateUrlLikeId/validateTableId';

@Injectable()
export class DraftRevisionValidationService {
  ensureDraftRevision(revision: { isDraft: boolean } | null): void {
    if (!revision) {
      throw new BadRequestException('Revision not found');
    }

    if (!revision.isDraft) {
      throw new BadRequestException('The revision is not a draft');
    }
  }

  ensureHasChanges(hasChanges: boolean): void {
    if (!hasChanges) {
      throw new BadRequestException('There are no changes');
    }
  }

  ensureValidTableId(tableId: string): void {
    validateTableId(tableId);
  }

  ensureValidRowId(rowId: string): void {
    validateRowId(rowId);
  }

  ensureIdsDifferent(currentId: string, newId: string): void {
    if (currentId === newId) {
      throw new BadRequestException('New ID must be different from current');
    }
  }
}

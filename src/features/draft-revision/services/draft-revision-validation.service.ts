import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
} from 'src/features/draft-revision/draft-revision.constants';

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
    if (!this.isValidId(tableId)) {
      throw new BadRequestException(
        `Table ID must be between ${MIN_ID_LENGTH} and ${MAX_ID_LENGTH} characters`,
      );
    }
  }

  ensureValidRowId(rowId: string): void {
    if (!this.isValidId(rowId)) {
      throw new BadRequestException(
        `Row ID must be between ${MIN_ID_LENGTH} and ${MAX_ID_LENGTH} characters`,
      );
    }
  }

  ensureIdsDifferent(currentId: string, newId: string): void {
    if (currentId === newId) {
      throw new BadRequestException('New ID must be different from current');
    }
  }

  private isValidId(id: string): boolean {
    return id.length >= MIN_ID_LENGTH && id.length <= MAX_ID_LENGTH;
  }
}

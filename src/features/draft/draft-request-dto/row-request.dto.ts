import { Injectable } from '@nestjs/common';
import {
  DraftContextKeys,
  DraftContextService,
} from 'src/features/draft/draft-context.service';

@Injectable()
export class DraftRowRequestDto {
  constructor(private readonly draftContext: DraftContextService) {}

  public get previousVersionId(): string {
    return this.draftContext.resolveKey(
      DraftContextKeys.DraftRowPreviousVersionId,
    );
  }

  public set previousVersionId(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftRowPreviousVersionId, value);
  }

  public get versionId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftRowVersionId);
  }

  public set versionId(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftRowVersionId, value);
  }

  public get id(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftRowId);
  }

  public set id(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftRowId, value);
  }
}

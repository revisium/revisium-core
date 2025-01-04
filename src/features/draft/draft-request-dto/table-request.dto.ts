import { Injectable } from '@nestjs/common';
import {
  DraftContextKeys,
  DraftContextService,
} from 'src/features/draft/draft-context.service';

@Injectable()
export class DraftTableRequestDto {
  constructor(private readonly draftContext: DraftContextService) {}

  public get previousVersionId(): string {
    return this.draftContext.resolveKey(
      DraftContextKeys.DraftTablePreviousVersionId,
    );
  }

  public set previousVersionId(value: string) {
    this.draftContext.setKey(
      DraftContextKeys.DraftTablePreviousVersionId,
      value,
    );
  }

  public get versionId(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftTableVersionId);
  }

  public set versionId(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftTableVersionId, value);
  }

  public get id(): string {
    return this.draftContext.resolveKey(DraftContextKeys.DraftTableId);
  }

  public set id(value: string) {
    this.draftContext.setKey(DraftContextKeys.DraftTableId, value);
  }
}

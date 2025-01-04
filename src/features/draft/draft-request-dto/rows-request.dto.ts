import { Injectable } from '@nestjs/common';
import {
  DraftContextKeys,
  DraftContextService,
} from 'src/features/draft/draft-context.service';

interface RowDto {
  id: string;
  versionId: string;
  previousVersionId: string;
}

@Injectable()
export class DraftRowsRequestDto {
  constructor(private draftContext: DraftContextService) {}

  public get rows(): RowDto[] {
    return this.draftContext.resolveKey(DraftContextKeys.DraftRows);
  }

  public set rows(value: RowDto[]) {
    this.draftContext.setKey(DraftContextKeys.DraftRows, value);
  }
}

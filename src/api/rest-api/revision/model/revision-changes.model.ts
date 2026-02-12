import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class RevisionChangeSummaryResponse {
  @ApiProperty()
  total: number;

  @ApiProperty()
  added: number;

  @ApiProperty()
  modified: number;

  @ApiProperty()
  removed: number;

  @ApiProperty()
  renamed: number;
}

export class RevisionChangesResponse {
  @ApiProperty()
  revisionId: string;

  @ApiProperty({ nullable: true, type: String })
  parentRevisionId: string | null;

  @ApiProperty()
  totalChanges: number;

  @ApiProperty({ type: RevisionChangeSummaryResponse })
  tablesSummary: RevisionChangeSummaryResponse;

  @ApiProperty({ type: RevisionChangeSummaryResponse })
  rowsSummary: RevisionChangeSummaryResponse;
}

export class ViewChangeResponse {
  @ApiProperty()
  viewId: string;

  @ApiProperty()
  viewName: string;

  @ApiProperty()
  changeType: string;

  @ApiProperty({ nullable: true, required: false, type: String })
  oldViewName?: string;
}

export class ViewsChangeDetailResponse {
  @ApiProperty()
  hasChanges: boolean;

  @ApiProperty({ type: [ViewChangeResponse] })
  changes: ViewChangeResponse[];

  @ApiProperty()
  addedCount: number;

  @ApiProperty()
  modifiedCount: number;

  @ApiProperty()
  removedCount: number;

  @ApiProperty()
  renamedCount: number;
}

export class JsonPatchOperationResponse {
  @ApiProperty()
  op: string;

  @ApiProperty()
  path: string;

  @ApiProperty({ nullable: true, required: false })
  value?: unknown;

  @ApiProperty({ nullable: true, required: false, type: String })
  from?: string;
}

export class HistoryPatchResponse {
  @ApiProperty()
  hash: string;

  @ApiProperty({ type: [JsonPatchOperationResponse] })
  patches: JsonPatchOperationResponse[];
}

export class SchemaMigrationDetailResponse {
  @ApiProperty()
  migrationType: string;

  @ApiProperty()
  migrationId: string;

  @ApiProperty({ nullable: true, required: false })
  initialSchema?: unknown;

  @ApiProperty({
    type: [JsonPatchOperationResponse],
    nullable: true,
    required: false,
  })
  patches?: JsonPatchOperationResponse[];

  @ApiProperty({ nullable: true, required: false, type: String })
  oldTableId?: string;

  @ApiProperty({ nullable: true, required: false, type: String })
  newTableId?: string;

  @ApiProperty({
    type: [HistoryPatchResponse],
    nullable: true,
    required: false,
  })
  historyPatches?: HistoryPatchResponse[];
}

export class TableChangeResponse {
  @ApiProperty()
  tableId: string;

  @ApiProperty()
  tableCreatedId: string;

  @ApiProperty({ nullable: true, type: String })
  fromVersionId: string | null;

  @ApiProperty({ nullable: true, type: String })
  toVersionId: string | null;

  @ApiProperty()
  changeType: string;

  @ApiProperty({ nullable: true, required: false, type: String })
  oldTableId?: string;

  @ApiProperty({ nullable: true, required: false, type: String })
  newTableId?: string;

  @ApiProperty({ type: [SchemaMigrationDetailResponse] })
  schemaMigrations: SchemaMigrationDetailResponse[];

  @ApiProperty({ type: ViewsChangeDetailResponse })
  viewsChanges: ViewsChangeDetailResponse;

  @ApiProperty()
  rowChangesCount: number;

  @ApiProperty()
  addedRowsCount: number;

  @ApiProperty()
  modifiedRowsCount: number;

  @ApiProperty()
  removedRowsCount: number;

  @ApiProperty()
  renamedRowsCount: number;
}

export class TableChangesConnection extends Paginated(
  TableChangeResponse,
  'TableChangeResponse',
) {}

export class FieldChangeResponse {
  @ApiProperty()
  fieldPath: string;

  @ApiProperty({ nullable: true, required: false })
  oldValue?: unknown;

  @ApiProperty({ nullable: true, required: false })
  newValue?: unknown;

  @ApiProperty()
  changeType: string;

  @ApiProperty({ nullable: true, required: false, type: String })
  movedFrom?: string;
}

export class RowChangeRowResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdId: string;

  @ApiProperty()
  versionId: string;

  @ApiProperty()
  data: unknown;

  @ApiProperty()
  hash: string;

  @ApiProperty()
  schemaHash: string;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty()
  meta: unknown;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;

  @ApiProperty({ type: Date })
  publishedAt: Date;
}

export class RowChangeTableResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdId: string;

  @ApiProperty()
  versionId: string;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty()
  system: boolean;

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date })
  updatedAt: Date;
}

export class RowChangeResponse {
  @ApiProperty()
  changeType: string;

  @ApiProperty({ nullable: true, required: false, type: RowChangeRowResponse })
  row?: RowChangeRowResponse;

  @ApiProperty({ nullable: true, required: false, type: RowChangeRowResponse })
  fromRow?: RowChangeRowResponse;

  @ApiProperty({
    nullable: true,
    required: false,
    type: RowChangeTableResponse,
  })
  table?: RowChangeTableResponse;

  @ApiProperty({
    nullable: true,
    required: false,
    type: RowChangeTableResponse,
  })
  fromTable?: RowChangeTableResponse;

  @ApiProperty({ type: [FieldChangeResponse] })
  fieldChanges: FieldChangeResponse[];
}

export class RowChangesConnection extends Paginated(
  RowChangeResponse,
  'RowChangeResponse',
) {}

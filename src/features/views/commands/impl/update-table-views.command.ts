import { TableViewsData } from 'src/features/views/types';

export type UpdateTableViewsCommandData = {
  readonly revisionId: string;
  readonly tableId: string;
  readonly viewsData: TableViewsData;
};

export class UpdateTableViewsCommand {
  constructor(public readonly data: UpdateTableViewsCommandData) {}
}

export type UpdateTableViewsCommandReturnType = boolean;

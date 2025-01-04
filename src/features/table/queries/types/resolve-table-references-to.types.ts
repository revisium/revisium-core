import { IPaginatedType } from 'src/features/share/pagination.interface';
import { TableWithContext } from 'src/features/share/types/table-with-context.types';

export type ResolveTableReferencesToReturnType =
  IPaginatedType<TableWithContext>;

import { Branch, Table } from '@prisma/client';

export type ApiCreateTableHandlerReturnType = {
  branch: Branch;
  table: Table;
};

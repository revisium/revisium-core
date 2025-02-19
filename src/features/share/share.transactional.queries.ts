import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindRowsInTableOrThrowQuery } from 'src/features/share/queries/impl/transactional/find-rows-in-table-or-throw.query';
import {
  FindBranchInProjectType,
  FindDraftRevisionInBranchType,
  FindHeadRevisionInBranchType,
  FindProjectInOrganizationType,
  FindRowInTableType,
  FindRowsInTableType,
  FindTableInRevisionType,
} from 'src/features/share/queries/types';
import {
  FindBranchInProjectOrThrowQuery,
  FindDraftRevisionInBranchOrThrowQuery,
  FindHeadRevisionInBranchOrThrowQuery,
  FindProjectInOrganizationOrThrowQuery,
  FindRowInTableOrThrowQuery,
  FindTableInRevisionOrThrowQuery,
  GetTableSchemaQuery,
  GetTableSchemaQueryReturnType,
} from 'src/features/share/queries/impl';

@Injectable()
export class ShareTransactionalQueries {
  constructor(private readonly queryBus: QueryBus) {}

  public async findProjectInOrganizationOrThrow(
    organizationId: string,
    projectName: string,
  ) {
    return this.queryBus.execute<
      FindProjectInOrganizationOrThrowQuery,
      FindProjectInOrganizationType
    >(
      new FindProjectInOrganizationOrThrowQuery({
        organizationId,
        projectName,
      }),
    );
  }

  public async findTableInRevisionOrThrow(revisionId: string, tableId: string) {
    return this.queryBus.execute<
      FindTableInRevisionOrThrowQuery,
      FindTableInRevisionType
    >(
      new FindTableInRevisionOrThrowQuery({
        revisionId,
        tableId,
      }),
    );
  }

  public async findRowInTableOrThrow(tableVersionId: string, rowId: string) {
    return this.queryBus.execute<
      FindRowInTableOrThrowQuery,
      FindRowInTableType
    >(
      new FindRowInTableOrThrowQuery({
        tableVersionId,
        rowId,
      }),
    );
  }

  public async findRowsInTableOrThrow(
    tableVersionId: string,
    rowIds: string[],
  ) {
    return this.queryBus.execute<
      FindRowsInTableOrThrowQuery,
      FindRowsInTableType
    >(
      new FindRowsInTableOrThrowQuery({
        tableVersionId: tableVersionId,
        rowIds,
      }),
    );
  }

  public async findBranchInProjectOrThrow(
    projectId: string,
    branchName: string,
  ) {
    return this.queryBus.execute<
      FindBranchInProjectOrThrowQuery,
      FindBranchInProjectType
    >(
      new FindBranchInProjectOrThrowQuery({
        projectId,
        branchName,
      }),
    );
  }

  public async findHeadRevisionInBranchOrThrow(branchId: string) {
    return this.queryBus.execute<
      FindHeadRevisionInBranchOrThrowQuery,
      FindHeadRevisionInBranchType
    >(
      new FindHeadRevisionInBranchOrThrowQuery({
        branchId,
      }),
    );
  }

  public async findDraftRevisionInBranchOrThrow(branchId: string) {
    return this.queryBus.execute<
      FindDraftRevisionInBranchOrThrowQuery,
      FindDraftRevisionInBranchType
    >(
      new FindDraftRevisionInBranchOrThrowQuery({
        branchId,
      }),
    );
  }

  public async getTableSchema(revisionId: string, tableId: string) {
    return this.queryBus.execute<
      GetTableSchemaQuery,
      GetTableSchemaQueryReturnType
    >(
      new GetTableSchemaQuery({
        revisionId,
        tableId,
      }),
    );
  }
}

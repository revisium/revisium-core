import { Injectable } from '@nestjs/common';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftRevisionRequestDto } from 'src/features/draft/draft-request-dto/draft-revision-request.dto';
import { DraftRowRequestDto } from 'src/features/draft/draft-request-dto/row-request.dto';
import { DraftTableRequestDto } from 'src/features/draft/draft-request-dto/table-request.dto';

// TODO avoid $queryRawUnsafe
// https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#dynamic-table-names-in-postgresql

@Injectable()
export class SessionChangelogService {
  constructor(
    private readonly transactionService: TransactionPrismaService,
    private readonly revisionRequestDto: DraftRevisionRequestDto,
    private readonly tableRequestDto: DraftTableRequestDto,
    private readonly rowRequestDto: DraftRowRequestDto,
  ) {}

  private get transaction() {
    return this.transactionService.getTransaction();
  }

  public checkRowInserts(rowId: string) {
    return this.checkRowExistence({
      changelogId: this.revisionRequestDto.changelogId,
      tableId: this.tableRequestDto.id,
      rowId,
      type: 'rowInserts',
    });
  }

  public async getCountRows(type: 'rowInserts' | 'rowUpdates' | 'rowDeletes') {
    const [{ count }] = await this.transaction.$queryRawUnsafe<
      [{ count: bigint }]
    >(
      `SELECT count(*) FROM jsonb_object_keys(
            (SELECT "${type}" -> '${this.tableRequestDto.id}' -> 'rows' FROM "Changelog" WHERE id = '${this.revisionRequestDto.changelogId}')
        ) as keys`,
    );

    return Number(count);
  }

  public async addRow(type: 'rowInserts' | 'rowUpdates' | 'rowDeletes') {
    return this.transaction.$executeRawUnsafe(
      `UPDATE "Changelog" SET "${type}" = jsonb_set(
            "${type}",
            '{${this.tableRequestDto.id}, rows, ${this.rowRequestDto.id}}',
            '""'
        ) WHERE id='${this.revisionRequestDto.changelogId}'`,
    );
  }

  public async addRows(
    type: 'rowInserts' | 'rowUpdates' | 'rowDeletes',
    ids: string[],
  ) {
    const tableId = this.tableRequestDto.id;
    const changelogId = this.revisionRequestDto.changelogId;

    const idsObject = ids.reduce<Record<string, ''>>((acc, id) => {
      acc[id] = '';
      return acc;
    }, {});

    const idsObjectJson = JSON.stringify(idsObject);

    const query = `
    UPDATE "Changelog"
    SET "${type}" = jsonb_set(
      "${type}",
      '{${tableId}, rows}',
      COALESCE(
        (
          "${type}"->'${tableId}'->'rows'
        )::jsonb || '${idsObjectJson}'::jsonb,
        '${idsObjectJson}'::jsonb
      ),
      true
    )
    WHERE id='${changelogId}'
  `;

    return this.transaction.$executeRawUnsafe(query);
  }

  public async removeRow(type: 'rowInserts' | 'rowUpdates' | 'rowDeletes') {
    return this.transaction.$executeRawUnsafe(
      `UPDATE "Changelog" SET "${type}" = jsonb_set(
            "${type}",
            '{${this.tableRequestDto.id}, rows}',
            ("${type}" -> '${this.tableRequestDto.id}' -> 'rows') - '${this.rowRequestDto.id}'
        ) WHERE id='${this.revisionRequestDto.changelogId}'`,
    );
  }

  public async addTableForRow(
    type: 'rowInserts' | 'rowUpdates' | 'rowDeletes',
  ) {
    return this.transaction.$executeRawUnsafe(
      `UPDATE "Changelog" SET "${type}" = jsonb_set(
            "${type}",
            '{${this.tableRequestDto.id}}',
            '{"rows": {}}'
        ) WHERE id='${this.revisionRequestDto.changelogId}'`,
    );
  }

  public async addTable(
    type: 'tableInserts' | 'tableUpdates' | 'tableDeletes',
  ) {
    return this.transaction.$executeRawUnsafe(
      `UPDATE "Changelog" SET "${type}" = jsonb_set(
            "${type}",
            '{${this.tableRequestDto.id}}',
            '""'
        ) WHERE id='${this.revisionRequestDto.changelogId}'`,
    );
  }

  public async removeTable(
    type:
      | 'rowInserts'
      | 'rowUpdates'
      | 'rowDeletes'
      | 'tableInserts'
      | 'tableUpdates'
      | 'tableDeletes',
  ) {
    return this.transaction.$executeRawUnsafe(
      `UPDATE "Changelog" SET "${type}" = "${type}" - '${this.tableRequestDto.id}' WHERE id='${this.revisionRequestDto.changelogId}'`,
    );
  }

  public async checkTableExistence(
    type:
      | 'rowInserts'
      | 'rowUpdates'
      | 'rowDeletes'
      | 'tableInserts'
      | 'tableUpdates'
      | 'tableDeletes',
  ) {
    const result = await this.transaction.$queryRawUnsafe<
      [{ id: string } | null]
    >(`
      SELECT id FROM "Changelog"
      WHERE id = '${this.revisionRequestDto.changelogId}'
      AND "${type}"::jsonb ? '${this.tableRequestDto.id}';
    `);

    return result[0]?.id === this.revisionRequestDto.changelogId;
  }

  public async checkRowExistence({
    changelogId,
    type,
    tableId,
    rowId,
  }: {
    changelogId: string;
    type: 'rowInserts' | 'rowUpdates' | 'rowDeletes';
    tableId: string;
    rowId: string;
  }) {
    const result = await this.transaction.$queryRawUnsafe<
      [{ id: string } | null]
    >(`
      SELECT id FROM "Changelog"
      WHERE id = '${changelogId}'
      AND ("${type}"::jsonb -> '${tableId}'::text IS NOT NULL 
      AND "${type}"::jsonb -> '${tableId}'::text -> 'rows' ? '${rowId}');
    `);

    return result[0]?.id === changelogId;
  }
}

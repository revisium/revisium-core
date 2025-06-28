import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetRowSuggestionQuery,
  GetRowSuggestionQueryData,
  GetRowSuggestionQueryReturnType,
} from 'src/features/enterprise/ai/queries/impl';
import { SuggestionService } from 'src/features/enterprise/ai/services/suggestion.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@QueryHandler(GetRowSuggestionQuery)
export class GetRowSuggestionHandler
  implements
    IQueryHandler<GetRowSuggestionQuery, GetRowSuggestionQueryReturnType>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly suggestionService: SuggestionService,
  ) {}

  public async execute({
    data,
  }: GetRowSuggestionQuery): Promise<GetRowSuggestionQueryReturnType> {
    const { schema } = await this.getSchema(data);

    // TODO validate data.data according schema
    // TODO validate user prompt

    return this.suggestionService.rowSuggestion({
      projectName: await this.getProjectName(data.revisionId),
      tableId: data.tableId,
      rowId: data.rowId,
      schema,
      data: data.data as JsonValue,
      userPrompt: data.prompt,
    });
  }

  private getSchema(data: GetRowSuggestionQueryData) {
    return this.shareTransactionalQueries.getTableSchema(
      data.revisionId,
      data.tableId,
    );
  }

  private async getProjectName(revisionId: string) {
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      include: {
        branch: {
          select: {
            id: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!revision) {
      throw new NotFoundException('Revision not found');
    }

    return revision.branch.project.name;
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PluginListService } from 'src/features/plugin/plugin.list.service';
import {
  CreateRowOptions,
  InternalCreateRowOptions,
} from 'src/features/plugin/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { createJsonValueStore } from 'src/features/share/utils/schema/lib/createJsonValueStore';
import { JsonValue } from 'src/features/share/utils/schema/types/json.types';

@Injectable()
export class PluginService {
  constructor(
    private readonly shareTransactionalQueries: ShareTransactionalQueries,
    private readonly jsonSchemaStore: JsonSchemaStoreService,
    private readonly pluginsListService: PluginListService,
  ) {}

  public async createRow(
    options: CreateRowOptions,
  ): Promise<Prisma.InputJsonValue> {
    const { schema } = await this.shareTransactionalQueries.getTableSchema(
      options.revisionId,
      options.tableId,
    );

    const schemaStore = this.jsonSchemaStore.create(schema);
    const valueStore = createJsonValueStore(
      schemaStore,
      options.rowId,
      options.data as JsonValue,
    );

    const internalOptions: InternalCreateRowOptions = {
      ...options,
      schemaStore,
      valueStore,
    };

    for (const plugin of this.pluginsListService.orderedPlugins) {
      await plugin.createRow(internalOptions);
    }

    return valueStore.getPlainValue();
  }
}

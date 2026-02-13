import { Injectable } from '@nestjs/common';
import { Plugin } from 'graphql-yoga';
import * as process from 'node:process';
import { GraphqlMetricsService } from 'src/infrastructure/metrics/graphql/graphql-metrics.service';
import { getDurationInSeconds } from 'src/infrastructure/metrics/utils';

@Injectable()
export class GraphqlMetricsPlugin {
  constructor(private readonly graphqlMetrics: GraphqlMetricsService) {}

  createPlugin(): Plugin {
    return {
      onExecute: ({ args }) => {
        const startAt = process.hrtime();
        const labels = getLabels(args);

        this.graphqlMetrics.didResolveOperation(labels);

        return {
          onExecuteDone: ({ result }) => {
            const hasErrors =
              !Array.isArray(result) &&
              'errors' in result &&
              result.errors?.length;

            if (hasErrors) {
              this.graphqlMetrics.didEncounterErrors(labels);
            }

            this.graphqlMetrics.requestDurationSeconds(
              {
                ...labels,
                result: hasErrors ? 'false' : 'true',
              },
              getDurationInSeconds(startAt),
            );
          },
        };
      },
    };
  }
}

function getLabels(args: {
  operationName?: string | null;
  document: {
    definitions: ReadonlyArray<{ kind: string; operation?: string }>;
  };
}) {
  const firstDef = args.document.definitions[0];
  return {
    operationName: args.operationName ?? undefined,
    operation:
      firstDef?.kind === 'OperationDefinition' ? firstDef.operation : undefined,
  };
}

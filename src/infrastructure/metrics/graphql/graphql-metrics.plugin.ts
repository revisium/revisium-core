import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestListener,
} from '@apollo/server';
import { Injectable } from '@nestjs/common';
import * as process from 'node:process';
import { GraphqlMetricsService } from 'src/infrastructure/metrics/graphql/graphql-metrics.service';
import { getDurationInSeconds } from 'src/infrastructure/metrics/utils';

@Injectable()
export class GraphqlMetricsPlugin implements ApolloServerPlugin {
  constructor(private readonly graphqlMetrics: GraphqlMetricsService) {}

  async requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
    const startAt = process.hrtime();

    return {
      didResolveOperation: async (requestContext) => {
        this.graphqlMetrics.didResolveOperation(getLabels(requestContext));
      },

      willSendResponse: async (requestContext) => {
        this.graphqlMetrics.requestDurationSeconds(
          {
            ...getLabels(requestContext),
            result: 'true',
          },
          getDurationInSeconds(startAt),
        );
      },

      didEncounterErrors: async (requestContext) => {
        const labels = getLabels(requestContext);

        this.graphqlMetrics.didEncounterErrors(labels);

        this.graphqlMetrics.requestDurationSeconds(
          {
            ...labels,
            result: 'false',
          },
          getDurationInSeconds(startAt),
        );
      },
    };
  }
}

function getLabels(context: {
  request: { operationName?: string };
  operation?: { operation: string };
}) {
  return {
    operationName: context.request.operationName,
    operation: context.operation?.operation,
  };
}

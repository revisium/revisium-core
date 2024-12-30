import { Injectable } from '@nestjs/common';
import {
  GRAPHQL_DID_ENCOUNTER_ERRORS_TOTAL,
  GRAPHQL_DID_RESOLVE_OPERATION_TOTAL,
  GRAPHQL_REQUEST_DURATION_SECONDS,
} from 'src/metrics/graphql/constants';
import * as client from 'prom-client';

type Labels = {
  operationName?: string;
  operation?: string;
};

@Injectable()
export class GraphqlMetricsService {
  private readonly requestDurationSecondsHistogram = new client.Histogram({
    name: GRAPHQL_REQUEST_DURATION_SECONDS,
    help: 'Duration of GraphQL requests in seconds',
    labelNames: ['operationName', 'operation', 'result'],
  });

  private readonly didResolveOperationTotalCounter = new client.Counter({
    name: GRAPHQL_DID_RESOLVE_OPERATION_TOTAL,
    help: 'Total number of successfully resolved GraphQL operations',
    labelNames: ['operationName', 'operation'],
  });

  private readonly didEncounterErrorsTotalCounter = new client.Counter({
    name: GRAPHQL_DID_ENCOUNTER_ERRORS_TOTAL,
    help: 'Total number of errors encountered during GraphQL request processing',
    labelNames: ['operationName', 'operation'],
  });

  constructor() {}

  public requestDurationSeconds(
    labels: Labels & {
      result?: 'true' | 'false';
    },
    durationInSeconds: number,
  ) {
    this.requestDurationSecondsHistogram.observe(labels, durationInSeconds);
  }

  public didResolveOperation(labels: Labels) {
    this.didResolveOperationTotalCounter.inc(labels);
  }

  public didEncounterErrors(labels: Labels) {
    this.didEncounterErrorsTotalCounter.inc(labels);
  }
}

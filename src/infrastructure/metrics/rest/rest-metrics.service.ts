import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';
import {
  REST_REQUEST_DURATION_SECONDS,
  REST_REQUEST_ERRORS_TOTAL,
  REST_REQUESTS_TOTAL,
} from 'src/infrastructure/metrics/rest/constants';

type Labels = {
  method?: string;
  route?: string;
  status?: string;
};

@Injectable()
export class RestMetricsService {
  private readonly requestDurationSecondsHistogram = new client.Histogram({
    name: REST_REQUEST_DURATION_SECONDS,
    help: 'Duration of REST API requests in seconds',
    labelNames: ['method', 'route', 'status'],
  });

  private readonly requestTotalCounter = new client.Counter({
    name: REST_REQUESTS_TOTAL,
    help: 'Total number of REST API requests',
    labelNames: ['method', 'route', 'status'],
  });

  private readonly requestErrorsTotalCounter = new client.Counter({
    name: REST_REQUEST_ERRORS_TOTAL,
    help: 'Total number of errors encountered during REST API request processing',
    labelNames: ['method', 'route', 'status'],
  });

  constructor() {}

  public requestDurationSeconds(labels: Labels, durationInSeconds: number) {
    this.requestDurationSecondsHistogram.observe(labels, durationInSeconds);
  }

  public requestTotal(labels: Labels) {
    this.requestTotalCounter.inc(labels);
  }

  public requestErrors(labels: Labels) {
    this.requestErrorsTotalCounter.inc(labels);
  }
}

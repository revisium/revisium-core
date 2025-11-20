import { Endpoint } from 'src/__generated__/client';
import { EndpointModel } from 'src/api/rest-api/endpoint/model';

export const transformFromPrismaToEndpointModel = (
  data: Endpoint,
): EndpointModel => {
  return {
    id: data.id,
    createdAt: data.createdAt,
    type: data.type,
  };
};

export const transformFromPrismaToEndpointsModel = (
  data: Endpoint[],
): EndpointModel[] => {
  return data.map((item) => transformFromPrismaToEndpointModel(item));
};

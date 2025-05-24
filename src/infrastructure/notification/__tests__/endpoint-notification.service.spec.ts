import { EndpointNotificationService } from '../endpoint-notification.service';
import { EndpointType } from '@prisma/client';

describe('EndpointNotificationService', () => {
  const mockClient = {
    emit: jest.fn(),
  };

  let service: EndpointNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EndpointNotificationService(mockClient as any);
  });

  it('should emit endpoint_created', () => {
    service.create('endpoint-1');
    expect(mockClient.emit).toHaveBeenCalledWith(
      'endpoint_created',
      'endpoint-1',
    );
  });

  it('should emit endpoint_updated', () => {
    service.update('endpoint-2');
    expect(mockClient.emit).toHaveBeenCalledWith(
      'endpoint_updated',
      'endpoint-2',
    );
  });

  it('should emit endpoint_deleted', () => {
    service.delete('endpoint-3', EndpointType.GRAPHQL);
    expect(mockClient.emit).toHaveBeenCalledWith('endpoint_deleted', {
      endpointId: 'endpoint-3',
      endpointType: EndpointType.GRAPHQL,
    });
  });
});

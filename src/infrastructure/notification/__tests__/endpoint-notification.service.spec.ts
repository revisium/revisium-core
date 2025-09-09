import { EndpointNotificationService } from '../endpoint-notification.service';

describe('EndpointNotificationService', () => {
  const mockClient = {
    notify: jest.fn(),
  };

  let service: EndpointNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EndpointNotificationService(mockClient as any);
  });

  it('should emit endpoint_created', () => {
    service.create('endpoint-1');
    expect(mockClient.notify).toHaveBeenCalledWith('endpoint_changes', {
      action: 'endpoint_created',
      endpointId: 'endpoint-1',
    });
  });

  it('should emit endpoint_updated', () => {
    service.update('endpoint-2');
    expect(mockClient.notify).toHaveBeenCalledWith('endpoint_changes', {
      action: 'endpoint_updated',
      endpointId: 'endpoint-2',
    });
  });

  it('should emit endpoint_deleted', () => {
    service.delete('endpoint-3');
    expect(mockClient.notify).toHaveBeenCalledWith('endpoint_changes', {
      action: 'endpoint_deleted',
      endpointId: 'endpoint-3',
    });
  });
});

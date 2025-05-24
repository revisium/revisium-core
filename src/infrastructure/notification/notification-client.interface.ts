export interface NotificationClient {
  emit<Payload = unknown>(pattern: string, payload: Payload): void;
}

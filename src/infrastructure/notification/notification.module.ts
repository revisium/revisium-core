import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { InMemoryClient } from 'src/infrastructure/notification/in-memory-client';
import { notificationEventEmitter } from 'src/infrastructure/notification/notification-event-emitter';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'ENDPOINT_MICROSERVICE',
      useFactory: async (configService: ConfigService) => {
        const isBuild = configService.get<string>('IS_BUILD') === 'true';

        if (isBuild) {
          return new InMemoryClient(notificationEventEmitter);
        }

        const portPath = 'ENDPOINT_PORT';
        const hostPath = 'ENDPOINT_HOST';

        const envPort = configService.get<string>(portPath);

        if (!envPort) {
          throw new Error(`Environment variable not found: ${portPath}`);
        }
        const port = parseInt(envPort);

        const host = configService.get<string>(hostPath);

        if (!host) {
          throw new Error(`Environment variable not found: ${hostPath}`);
        }

        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: {
            port,
            host,
          },
        });
      },
      inject: [ConfigService],
    },
    EndpointNotificationService,
  ],
  exports: [EndpointNotificationService],
})
export class NotificationModule {}

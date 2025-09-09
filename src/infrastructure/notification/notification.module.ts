import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { InMemoryNotificationClient } from 'src/infrastructure/notification/in-memory-notification-client';
import { RedisNotificationClient } from 'src/infrastructure/notification/redis-notification-client';

@Module({
  imports: [ConfigModule, DatabaseModule, EventEmitterModule.forRoot()],
  providers: [
    {
      provide: 'ENDPOINT_MICROSERVICE',
      useFactory: async (
        configService: ConfigService,
        emitter: EventEmitter2,
        appOptions: AppOptions,
      ) => {
        if (appOptions.mode === 'monolith') {
          return new InMemoryNotificationClient(emitter);
        }

        const host = configService.getOrThrow('ENDPOINT_HOST');
        const port = parseInt(configService.getOrThrow('ENDPOINT_PORT'), 10);

        const client = ClientProxyFactory.create({
          transport: Transport.REDIS,
          options: {
            port,
            host,
          },
        });

        return new RedisNotificationClient(client);
      },
      inject: [ConfigService, EventEmitter2, APP_OPTIONS_TOKEN],
    },
    EndpointNotificationService,
  ],
  exports: [EndpointNotificationService],
})
export class NotificationModule {}

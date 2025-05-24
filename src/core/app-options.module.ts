import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';

@Global()
@Module({})
export class AppOptionsModule {
  static forRoot(options: AppOptions): DynamicModule {
    return {
      module: AppOptionsModule,
      providers: [{ provide: APP_OPTIONS_TOKEN, useValue: options }],
      exports: [APP_OPTIONS_TOKEN],
    };
  }
}

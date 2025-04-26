import { Module } from '@nestjs/common';
import { ForgeApiModule } from './forge-api.module';
import { ForgeApiWithChildModule } from './forge-api-with-child.module';

/**
 * Example 1: Using ForgeApiModule in your main AppModule
 * This is the simplest integration method, suitable for applications
 * that need a single global configuration.
 */
@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: 'api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            realtime: true,
            enforceRls: true,
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}

/**
 * Example 2: Using ForgeApiWithChildModule for more flexibility
 *
 * Main AppModule with global configuration
 */
@Module({
  imports: [
    ForgeApiWithChildModule.forRoot({
      prefix: 'api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            realtime: true,
            enforceRls: true,
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModuleWithChild {}

/**
 * Feature module with its own configuration
 * This allows different parts of your application to use
 * different configurations if needed.
 */
@Module({
  imports: [
    ForgeApiWithChildModule.forChild({
      prefix: 'feature-api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            enforceRls: false,
            realtime: false,
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
  ],
})
export class FeatureModule {}

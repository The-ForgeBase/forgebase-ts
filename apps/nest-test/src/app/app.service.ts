import { Inject, Injectable } from '@nestjs/common';
import { ForgeApi } from '@forgebase-ts/api';

@Injectable()
export class AppService {
  constructor(@Inject('FORGE_API') private readonly api: ForgeApi) {}

  async getData() {
    // Example: Get database schema using the injected ForgeApi
    const schema = await this.api.getDatabaseService().getSchema();
    return {
      message: 'Hello API',
      schema
    };
  }
}

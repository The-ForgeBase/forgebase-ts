import { Inject, Injectable } from '@nestjs/common';
// import { ForgeApi } from '@forgebase-ts/api/core';
import { ForgeApiService } from '@forgebase-ts/api/core/nest';

@Injectable()
export class AppService {
  constructor(private readonly api: ForgeApiService) {}

  async getData() {
    // Example: Get database schema using the injected ForgeApi
    const schema = await this.api.getDatabaseService().getSchema();
    return {
      message: 'Hello API',
      schema,
    };
  }
}

// @Injectable()
// export class AppService {
//   constructor(@Inject('FORGE_API') private readonly api: ForgeApi) {}

//   async getData() {
//     // Example: Get database schema using the injected ForgeApi
//     const schema = await this.api.getDatabaseService().getSchema();
//     return {
//       message: 'Hello API',
//       schema,
//     };
//   }
// }

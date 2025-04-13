import { Injectable, OnModuleInit } from '@nestjs/common';
import { ForgeApiService } from '@forgebase-ts/api/core/nest';

@Injectable()
export class TableSetupService implements OnModuleInit {
  constructor(private readonly forgeApiService: ForgeApiService) {}

  async onModuleInit() {
    try {
      // Get the database instance
      const db = this.forgeApiService.getDatabaseService().getDbInstance();

      // Check if the posts table exists
      const exists = await db.schema.hasTable('posts');

      if (!exists) {
        // Create the posts table
        await db.schema.createTable('posts', (table) => {
          table.increments('id').primary();
          table.string('title').notNullable();
          table.text('content');
          table.integer('author_id').notNullable();
          table.timestamps(true, true);
        });

        console.log('Created posts table');

        // Insert some sample data
        await db('posts').insert([
          {
            title: 'First Post',
            content: 'This is the first post',
            author_id: 1,
          },
          {
            title: 'Second Post',
            content: 'This is the second post',
            author_id: 2,
          },
        ]);

        console.log('Inserted sample posts');
      }

      // Set up permissions for the posts table
      const permissionService = this.forgeApiService
        .getDatabaseService()
        .getPermissionService();
      const permissions = await permissionService.getPermissionsForTable(
        'posts'
      );

      if (!permissions) {
        // Create default permissions that allow all operations
        await permissionService.setPermissionsForTable('posts', {
          operations: {
            SELECT: [{ allow: 'public' }],
            INSERT: [{ allow: 'public' }],
            UPDATE: [{ allow: 'public' }],
            DELETE: [{ allow: 'public' }],
          },
        });

        console.log('Set up permissions for posts table');
      }
    } catch (error) {
      console.error('Error setting up tables:', error);
    }
  }
}

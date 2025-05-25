import { Knex } from 'knex';
import { EntityService, Entity } from '../types';

class KnexEntityService implements EntityService {
  private knex: Knex;
  private tableName: string;

  constructor(knex: Knex, tableName: string) {
    this.knex = knex;
    this.tableName = tableName;
    this.initialize();
  }

  async initialize(): Promise<void> {}

  async findEntity(id: string, field: string): Promise<Entity | null> {
    const entity = await this.knex<Entity>(this.tableName)
      .where(field, id)
      .first();
    if (!entity) {
      return null;
    }
    return entity;
  }

  async createEntity(entity: Partial<Entity>): Promise<Entity> {
    const newEntity = await this.knex<Entity>(this.tableName)
      .insert(entity)
      .returning('*');
    if (!newEntity[0]) {
      throw new Error('Failed to create entity');
    }
    return newEntity[0];
  }

  async updateEntity(
    id: string,
    field: string,
    entity: Partial<Entity>,
  ): Promise<Entity> {
    const updatedEntity = await this.knex<Entity>(this.tableName)
      .where(field, id)
      .update(entity)
      .returning('*')
      .first();
    if (!updatedEntity) {
      throw new Error('Failed to update entity');
    }
    return updatedEntity;
  }

  async deleteEntity(id: string, field: string): Promise<void> {
    await this.knex<Entity>(this.tableName).where(field, id).delete();
  }
}

export default KnexEntityService;

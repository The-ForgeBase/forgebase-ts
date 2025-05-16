import { createMockDb } from '../test/utils/mock-db';
import { createContainer, asValue } from 'awilix';
import { ConfigStore, UserService } from './types';
import { KnexConfigStore } from './config';
import { KnexUserService } from './userService';

describe('Auth Container', () => {
  const { db, tracker } = createMockDb();

  beforeEach(() => {
    tracker.reset();
  });

  afterEach(() => {
    tracker.reset();
  });

  describe('Container Setup', () => {
    it('should create a container with basic dependencies', () => {
      const container = createContainer();

      // Register required dependencies
      container.register({
        knex: asValue(db),
        configStore: asValue({} as ConfigStore),
        userService: asValue({} as UserService),
      });

      expect(container.cradle.knex).toBeDefined();
      expect(container.cradle.configStore).toBeDefined();
      expect(container.cradle.userService).toBeDefined();
    });

    it('should register KnexConfigStore correctly', () => {
      const container = createContainer();
      container.register({
        knex: asValue(db),
        configStore: asValue(new KnexConfigStore(db)),
      });

      expect(container.cradle.configStore).toBeInstanceOf(KnexConfigStore);
    });

    it('should register KnexUserService correctly', () => {
      const container = createContainer();
      container.register({
        knex: asValue(db),
        userService: asValue(new KnexUserService(db)),
      });

      expect(container.cradle.userService).toBeInstanceOf(KnexUserService);
    });
  });
});

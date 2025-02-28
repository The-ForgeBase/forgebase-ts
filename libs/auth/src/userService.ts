import { hashPassword } from './lib/password';
import {
  AuthConfig,
  AuthInternalConfig,
  BaseUser,
  User,
  UserService,
} from './types';

export class KnexUserService<TUser extends User> implements UserService<TUser> {
  private table: string;
  private columns: Record<string, string>;

  private config: AuthConfig;
  private internalConfig: AuthInternalConfig<TUser>;

  constructor(config: AuthConfig, internalConfig: AuthInternalConfig<TUser>) {
    this.config = config;
    this.internalConfig = internalConfig;
    this.table = internalConfig.tableName || 'users';
    this.columns = {
      id: internalConfig.userColumns?.id || 'id',
      email: internalConfig.userColumns?.email || 'email',
      passwordHash: internalConfig.userColumns?.passwordHash || 'password_hash',
      createdAt: internalConfig.userColumns?.createdAt || 'created_at',
      updatedAt: internalConfig.userColumns?.updatedAt || 'updated_at',
    };
  }

  getConfig() {
    return this.config;
  }

  getInternalConfig() {
    return this.internalConfig;
  }

  getTable() {
    return this.table;
  }

  getColumns() {
    return this.columns;
  }

  async findUser(identifier: string): Promise<TUser | null> {
    return this.internalConfig
      .knex(this.table)
      .where(this.columns.email, identifier)
      .orWhere(this.columns.id, identifier)
      .first();
  }

  async createUser(
    userData: Partial<TUser>,
    password?: string
  ): Promise<TUser> {
    const { ...rest } = userData;

    // check if email is already taken
    const existingUser = await this.internalConfig
      .knex(this.table)
      .where(this.columns.email, userData.email)
      .first();

    if (existingUser) {
      throw new Error('Email already taken');
    }

    const hash = password ? await hashPassword(password) : null;

    if (!userData.email) {
      throw new Error('Email is required');
    }

    const user = await this.internalConfig
      .knex(this.table)
      .insert({
        ...rest,
        [this.columns.passwordHash]: hash,
        [this.columns.createdAt]: this.internalConfig.knex.fn.now(),
        [this.columns.updatedAt]: this.internalConfig.knex.fn.now(),
      })
      .returning('*');

    // console.log(user);

    return user[0];
  }

  async updateUser(
    userId: string,
    userData: Partial<Omit<TUser, keyof BaseUser>>
  ): Promise<TUser> {
    const user = await this.internalConfig
      .knex(this.table)
      .where(this.columns.id, userId)
      .update({
        ...userData,
        [this.columns.updatedAt]: this.internalConfig.knex.fn.now(),
      })
      .returning('*');

    return user[0];
  }

  async deleteUser(userId: string): Promise<void> {
    await this.internalConfig
      .knex(this.table)
      .where(this.columns.id, userId)
      .delete();
  }
}

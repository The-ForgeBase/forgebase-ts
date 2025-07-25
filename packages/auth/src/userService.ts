import { Knex } from 'knex';
import { AuthUsersTable } from './config/index.js';
import { hashPassword } from './lib/password.js';
import { User, UserService } from './types.js';

export class KnexUserService implements UserService {
  private table: string;
  private columns = {
    id: 'id',
    email: 'email',
    passwordHash: 'password_hash',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
    this.table = AuthUsersTable;
    this.columns = {
      id: 'id',
      email: 'email',
      passwordHash: 'password_hash',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
  }

  getTable() {
    return this.table;
  }

  getColumns() {
    return this.columns;
  }

  async findUser(identifier: string): Promise<User | null> {
    return this.knex(this.table)
      .where(this.columns.email, identifier)
      .orWhere(this.columns.id, identifier)
      .first();
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.knex(this.table).where(this.columns.id, userId).first();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.knex(this.table).where(this.columns.email, email).first();
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    return this.knex(this.table).where('phone', phone).first();
  }

  async createUser(userData: Partial<User>, password?: string): Promise<User> {
    const { ...rest } = userData;

    // check if email is already taken
    const existingUser = await this.knex(this.table)
      .where(this.columns.email, userData.email)
      .first();

    if (existingUser) {
      throw new Error('Email already taken');
    }

    const hash = password ? await hashPassword(password) : null;

    if (!userData.email) {
      throw new Error('Email is required');
    }

    const user = await this.knex(this.table)
      .insert({
        ...rest,
        [this.columns.passwordHash]: hash,
        [this.columns.createdAt]: this.knex.fn.now(),
        [this.columns.updatedAt]: this.knex.fn.now(),
      })
      .returning('*');

    // console.log(user);

    return user[0];
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const user = await this.knex(this.table)
      .where(this.columns.id, userId)
      .update({
        ...userData,
        [this.columns.updatedAt]: this.knex.fn.now(),
      })
      .returning('*');

    return user[0];
  }

  async deleteUser(userId: string): Promise<void> {
    await this.knex(this.table).where(this.columns.id, userId).delete();
  }

  async removeRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels',
  ) {
    const [user] = await this.knex(this.table)
      .where(this.columns.id, userId)
      .first();

    const existingList: string[] =
      type === 'labels'
        ? user.labels.split(',')
        : type === 'permissions'
          ? user.permissions.split(',')
          : user.teams.split(',');
    const newList = existingList.filter((el) => !list.includes(el));

    await this.knex(this.table)
      .where(this.columns.id, userId)
      .update({
        [type]: newList.join(','),
      });

    return newList;
  }

  async addRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels',
  ) {
    const [user] = await this.knex(this.table)
      .where(this.columns.id, userId)
      .first();

    const existingList: string[] =
      type === 'labels'
        ? user.labels.split(',')
        : type === 'permissions'
          ? user.permissions.split(',')
          : user.teams.split(',');
    const newList = [...existingList, ...list];

    await this.knex(this.table)
      .where(this.columns.id, userId)
      .update({
        [type]: newList.join(','),
      });

    return newList;
  }

  async setRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels',
  ) {
    await this.knex(this.table)
      .where(this.columns.id, userId)
      .update({
        [type]: list.join(','),
      });

    return list;
  }

  async setRole(userId: string, role: string): Promise<void> {
    await this.knex(this.table).where(this.columns.id, userId).update({
      role,
    });
  }
}

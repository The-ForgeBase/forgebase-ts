import { Knex } from 'knex';
import { SessionService, Entity, AuthToken, Session } from '../types';
import { generateSessionId, generateSessionToken } from '../lib/osolo';

class KnexSessionService implements SessionService {
  private knex: Knex;
  private tableName: string;

  constructor(knex: Knex, tableName: string) {
    this.knex = knex;
    this.tableName = tableName;
    this.initialize();
  }

  async initialize(): Promise<void> {}

  async createSession(entityId: string): Promise<AuthToken> {
    const token = generateSessionToken();
    const sessionToken = generateSessionId(token);

    await this.knex<Session>(this.tableName).insert({
      entity_id: entityId,
      token: sessionToken,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    });

    return token;
  }

  async verifySession(token: string) {
    const sessionToken = generateSessionId(token);

    // 1. Does the session exist in your database?
    const session = await this.knex<Session>(this.tableName)
      .where('token', sessionToken)
      .first();
    if (!session) {
      return { entity: null, token: null };
    }

    // 2. Is the session expired?
    if (session.expires_at < new Date()) {
      await this.knex<Session>(this.tableName)
        .where('token', sessionToken)
        .delete();
      return { entity: null, token: null };
    }

    // 3. Is the session valid?
    const entity = (await this.knex<Entity>('entities')
      .where({ id: session.entity_id })
      .first()) as Entity;

    if (!entity) {
      await this.knex<Session>(this.tableName)
        .where('token', sessionToken)
        .delete();
      return { entity: null, token: null };
    }

    // 4. We'll also extend the session expiration when it's close to expiration.
    // This ensures active sessions are persisted, while inactive ones will eventually expire.
    // We'll handle this by checking if there's less than 15 days (half of the 30 day expiration) before expiration.
    if (session.expires_at < new Date(Date.now() + 1000 * 60 * 60 * 24 * 15)) {
      await this.knex<Session>(this.tableName)
        .where('token', sessionToken)
        .update({
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        });
    }

    return { entity, token };
  }

  async destroySession(token: string): Promise<void> {
    const sessionToken = generateSessionId(token);
    await this.knex<Session>(this.tableName)
      .where('token', sessionToken)
      .delete();
  }

  async destroyAllSessions(entityId: string | number): Promise<void> {
    await this.knex<Session>(this.tableName)
      .where('entity_id', entityId)
      .delete();
  }
}

export default KnexSessionService;

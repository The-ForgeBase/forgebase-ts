import { UserContext } from '@forgebase-ts/database';
import { User, Session } from 'better-auth/types';
import { Context as HonoContext } from 'hono';

export const honoUserMiddleware = async (
  session: any,
  c: HonoContext,
  next: any
) => {
  if (!session) {
    c.set('user', null);
    c.set('session', null);
    c.set('userContext', {
      userId: '',
      labels: [],
      teams: [],
      permissions: [],
      role: '',
    });
    return next();
  }
  let labels: string[] = [];
  if (session.user.labels) {
    labels = session.user.labels.split(',');
  }
  let teams: string[] = [];
  if (session.user.teams) {
    teams = session.user.teams.split(',');
  }
  let permissions: string[] = [];
  if (session.user.permissions) {
    permissions = session.user.permissions.split(',');
  }
  const userContext: UserContext = {
    userId: session.user.id,
    labels,
    teams,
    permissions,
    role: session.user.role || '',
  };

  c.set('user', session.user);
  c.set('session', session);
  c.set('userContext', userContext);
  return next();
};

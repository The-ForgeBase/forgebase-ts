import { SessionData } from '@forgebase-ts/auth/adapters/web';
import { UserContext } from '@forgebase-ts/database/types';

export type FgAPiVariables = {
  userContext: UserContext | null;
  isAdmin: boolean;
  isSystem: boolean;
  session: SessionData | null;
};

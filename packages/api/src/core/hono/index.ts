import { SessionData } from '@the-forgebase/auth/adapters/web';
import { UserContext } from '@the-forgebase/database';

export type FgAPiVariables = {
  userContext: UserContext | null;
  isAdmin: boolean;
  isSystem: boolean;
  session: SessionData | null;
};

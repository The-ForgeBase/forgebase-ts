import { createReAuthEngine } from '@the-forgebase/reauth';
import emailPasswordAuth from '@the-forgebase/reauth/plugins/email-password';
import {
  KnexEntityService,
  KnexSessionService,
} from '@the-forgebase/reauth/services';
import { db } from '..';

const entity = new KnexEntityService(db, 'entities');
const session = new KnexSessionService(db, 'sessions');

const reAuth = createReAuthEngine({
  plugins: [
    emailPasswordAuth({
      config: {
        verifyEmail: true,
        sendCode: async (entity, code, email, type) => {},
      },
    }),
  ],
  entity,
  session,
});

export default reAuth;

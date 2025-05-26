import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import knex from 'knex';

const app = new Hono();

export const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: './test.db',
  },
  useNullAsDefault: true,
});

// app.use(async (c, next) => {
//   c.set('entity', null);
//   c.set('token', null);
//   const token = getCookie(c, 'token');
//   console.log(token);
//   if (token) {
//     const container = reAuth.getContainer();
//     const sessionService = container.cradle.sessionService;
//     const { entity, token: newToken } = await sessionService.verifySession(
//       token as string,
//     );

//     console.log(entity, newToken);

//     if (!entity || !newToken) {
//       // Invalid session, clear cookie
//       deleteCookie(c, 'token');
//       return next();
//     }

//     c.set('entity', entity);
//     c.set('token', newToken);
//     setCookie(c, 'token', newToken);
//   }
//   await next();
// });

const auth = new Hono();

// // list of plugins and there names with steps
// const authRoutes = reAuth.getAllPlugins().map((plugin: AuthPlugin) => {
//   return {
//     name: plugin.name,
//     steps: plugin.steps.map((step) => ({
//       name: step.name,
//       protocol: step.protocol,
//     })),
//   };
// });

// // each step is a route
// authRoutes.forEach((route) => {
//   route.steps.forEach((step) => {
//     // If no http protocol, skip
//     if (!step.protocol?.http) return;
//     auth.on(
//       [step.protocol.http.method],
//       `/${route.name}/${step.name}`,
//       async (c) => {
//         try {
//           const expectedInputs = reAuth.getStepInputs(route.name, step.name);
//           let inputs: Record<string, any> = {};
//           const body: Record<string, any> = await c.req.json();

//           //1. find the expected inputs in the body
//           expectedInputs.forEach((input) => {
//             if (body[input]) {
//               inputs[input] = body[input];
//             }
//           });

//           //2. find the expected inputs in the query params
//           expectedInputs.forEach((input) => {
//             if (c.req.query(input)) {
//               inputs[input] = c.req.query(input);
//             }
//           });

//           if (step.protocol.http && step.protocol.http.auth) {
//             const entity = c.get('entity');
//             const token = c.get('token');
//             if (!entity) {
//               return c.json({ error: 'Unauthorized' }, 401);
//             }
//             inputs.entity = entity;
//             inputs.token = token;
//           }

//           if (Object.keys(inputs).length !== expectedInputs.length) {
//             return c.json({ error: 'Missing inputs' }, 400);
//           }

//           const {
//             token,
//             redirect: rd,
//             success,
//             status,
//             ...rest
//           }: AuthOutput = await reAuth.executeStep(
//             route.name,
//             step.name,
//             inputs,
//           );

//           const st: any | undefined = step.protocol.http
//             ? step.protocol.http[status]
//             : undefined;

//           if (!success) {
//             return c.json(
//               {
//                 success,
//                 ...rest,
//               },
//               { status: st || 400 },
//             );
//           }
//           if (token) {
//             // save cookie
//             setCookie(c, 'token', token);
//           }

//           if (rd) {
//             return c.redirect(rd);
//           }

//           return c.json(
//             {
//               success,
//               ...rest,
//             },
//             { status: st || 200 },
//           );
//         } catch (error) {
//           console.log(error);
//           return c.json({ error }, 500);
//         }
//       },
//     );
//   });
// });

app.route('/auth', auth);

app.get('/', (c) => {
  return c.json({ message: 'Hello Hono!' });
});

showRoutes(app, {
  verbose: true,
});

serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

declare module 'hono' {
  // interface ContextVariableMap {
  //   entity: Entity | null;
  //   token: AuthToken | null;
  // }
}

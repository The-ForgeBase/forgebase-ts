import { defineEventHandler, getRequestURL, parseCookies } from 'h3';

export default defineEventHandler(async (event) => {
  // Only run this middleware for API routes
  if (getRequestURL(event).pathname.startsWith('/api/v1')) {
    const cookies = parseCookies(event);
    const adminToken = cookies['admin_token'];

    // if (!adminToken) {
    //   event.node.res.statusCode = 401;
    //   return {
    //     error: 'Authentication required'
    //   };
    // }

    // Add the token to the event context for reuse
    // Add the token to the event context for reuse
    event.context['auth'] = { adminToken };
  }
});

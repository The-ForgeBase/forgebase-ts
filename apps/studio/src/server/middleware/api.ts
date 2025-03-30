import {
  createError,
  defineEventHandler,
  getRequestURL,
  parseCookies,
} from 'h3';

export default defineEventHandler(async (event) => {
  // Only run this middleware for API routes
  if (getRequestURL(event).pathname.startsWith('/api')) {
    const cookies = parseCookies(event);
    const adminToken = cookies['admin_token'];

    if (!adminToken) {
      throw createError({
        statusCode: 401,
        message: 'Authentication failed',
      });
    }

    // Add the token to the event context for reuse
    // Add the token to the event context for reuse
    event.context['auth'] = { adminToken };
  }
});

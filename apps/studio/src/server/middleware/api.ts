import {
  createError,
  defineEventHandler,
  getRequestURL,
  parseCookies,
  sendRedirect,
} from 'h3';

export default defineEventHandler(async (event) => {
  console.log('api middleware');
  const pathname = getRequestURL(event).pathname;
  console.log('Pathname:', pathname);

  // Only run this middleware for API routes
  if (!pathname.startsWith('/api') || pathname.includes('studio')) {
    console.log('Not an API route, skipping middleware');
    return;
  }

  const cookies = parseCookies(event);
  const adminToken = cookies['admin_token'];

  if (adminToken) {
    try {
      const apiUrl = process.env['ADMIN_API_URL'] || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/admin/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `AdminBearer ${adminToken}`,
        },
      });

      if (!res.ok) {
        return sendRedirect(event, '/signin', 401);
      }

      const data = await res.json();
      if (data.admin) {
        event.context['auth'] = data.admin;
      }
    } catch (error) {
      console.error('API authentication error:', error);
      return sendRedirect(event, '/signin', 401);
    }
  } else {
    return sendRedirect(event, '/signin', 401);
  }
});

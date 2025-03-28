import {
  defineEventHandler,
  sendRedirect,
  getRequestURL,
  parseCookies,
  deleteCookie,
  createError,
} from 'h3';

/**
 * Authentication middleware for the studio application
 *
 * Handles authentication state across different routes:
 * - Redirects unauthenticated users to signin when accessing protected routes
 * - Redirects authenticated users to studio when accessing signin
 * - Adds auth context for authenticated requests
 *
 * @param event - H3 event object
 */
export default defineEventHandler(async (event) => {
  // Get the request path once
  const pathname = getRequestURL(event).pathname;
  const cookies = parseCookies(event);
  const adminToken = cookies['admin_token'];
  const isAuthRoute = pathname.startsWith('/signin');
  const isProtectedRoute =
    pathname.startsWith('/studio') || pathname.startsWith('/api/v1');

  // Only verify token if it exists
  if (adminToken) {
    try {
      // Use environment variable or config for API URL to support different environments
      const apiUrl = process.env['ADMIN_API_URL'] || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/admin/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `AdminBearer ${adminToken}`,
        },
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        // Clear invalid token
        deleteCookie(event, 'admin_token');

        // Only throw error for protected routes
        if (isProtectedRoute) {
          return sendRedirect(event, '/signin', 401);
        }
      } else if (data.admin) {
        // Set auth context if verification succeeded
        // Set auth context if verification succeeded
        event.context['auth'] = data.admin;

        // Redirect authenticated users away from login page
        if (isAuthRoute) {
          return sendRedirect(event, '/studio', 302);
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      deleteCookie(event, 'admin_token');

      if (isProtectedRoute) {
        return sendRedirect(event, '/signin', 401);
      }
    }
  } else if (isProtectedRoute) {
    // Redirect unauthenticated users trying to access protected routes
    console.log('No admin token found, redirecting to signin');
    return sendRedirect(event, '/signin', 401);
  }
});

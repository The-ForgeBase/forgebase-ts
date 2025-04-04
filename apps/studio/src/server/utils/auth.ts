import { H3Event, parseCookies } from 'h3';

export interface AuthContext {
  id: string;
  email: string;
  role: string;
  [key: string]: any;
}

/**
 * Get the authentication token from the request cookies
 * @param event - H3 event object
 * @returns The admin token if present, null otherwise
 */
export async function getAuthToken(event: H3Event): Promise<string | null> {
  const cookies = parseCookies(event);
  return cookies['admin_token'] || null;
}

/**
 * Validate the authentication token and return it if valid
 * @param event - H3 event object
 * @throws Error if no valid authentication token is present
 * @returns The validated admin token
 */
export async function validateAuth(event: H3Event): Promise<string> {
  const token = await getAuthToken(event);
  if (!token) {
    throw new Error('Authentication required');
  }

  // Ensure auth context exists
  const auth = event.context['auth'] as AuthContext | undefined;
  if (!auth) {
    throw new Error('Invalid authentication state');
  }

  return token;
}

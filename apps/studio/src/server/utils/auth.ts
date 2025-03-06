import { parseCookies } from 'h3';

export async function getAuthToken(event: any) {
  const cookies = parseCookies(event);
  return cookies['admin_token'] || null;
}

export async function validateAuth(event: any) {
  const token = await getAuthToken(event);
  if (!token) {
    throw new Error('Authentication required');
  }
  return token;
}

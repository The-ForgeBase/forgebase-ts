// src/app/pages/newsletter.server.ts
import { PageServerLoad } from '@analogjs/router';
import {
  type PageServerAction,
  redirect,
  json,
  fail,
} from '@analogjs/router/server/actions';
import { readFormData, setCookie, sendRedirect } from 'h3';

export async function action({ event }: PageServerAction) {
  try {
    const body = await readFormData(event);
    const email = body.get('email')?.toString().trim();
    const password = body.get('password')?.toString();

    // Input validation
    if (!email || !email.includes('@')) {
      return fail(422, { email: 'Valid email is required' });
    }

    if (!password || password.length < 6) {
      return fail(422, { password: 'Password must be at least 6 characters' });
    }

    const apiUrl = process.env['ADMIN_API_URL'] || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return fail(res.status, {
        error: data.message || 'Authentication failed',
      });
    }

    // Set the admin token cookie
    if (data.token) {
      setCookie(event, 'admin_token', data.token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Authentication error:', error);
    return fail(500, { error: 'Authentication failed. Please try again.' });
  }
}

export const load = async ({ event }: PageServerLoad) => {
  const user = event.context['auth'];
  console.log('user', user);
  if (user) {
    return sendRedirect(event, '/studio', 302);
  }

  return {
    loaded: true,
  };
};

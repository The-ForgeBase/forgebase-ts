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
    const email = body.get('email') as string;
    const password = body.get('password') as string;

    // Removed logging of sensitive information

    if (!email) {
      return fail(422, { email: 'Email is required' });
    }

    if (!password) {
      return fail(422, { password: 'Password is required' });
    }

    const res = await fetch('http://localhost:8000/api/admin/login', {
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
      return fail(res.status, data);
    }

    // Extract Set-Cookie header and forward it to the client
    const cookies = res.headers.getSetCookie?.() || [];

    for (const cookie of cookies) {
      const match = cookie.match(/^([^=]+)=([^;]+)/);
      if (match && match.length >= 3) {
        const [, name, value] = match;
        // Forward each cookie to the client with appropriate settings
        setCookie(event, name, value, {
          httpOnly: cookie.includes('HttpOnly'),
          secure: cookie.includes('Secure'),
          path: '/',
          // Extract maxAge if present in cookie string
          maxAge: parseInt(cookie.match(/Max-Age=(\d+)/)?.[1] || '3600'),
        });
      }
    }

    // If cookie forwarding failed but we have a token in the response body
    if (cookies.length === 0 && data.token) {
      setCookie(event, 'admin_token', data.token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        path: '/',
      });
    }

    return json({ type: 'success' });
  } catch (error) {
    console.error('Authentication error:', error);
    return fail(500, { error: 'Authentication failed. Please try again.' });
  }
}

export const load = async ({
  params, // params/queryParams from the request
  req, // H3 Request
  res, // H3 Response handler
  fetch, // internal fetch for direct API calls,
  event, // full request event
}: PageServerLoad) => {
  const user = event.context['auth'];

  if (user) {
    sendRedirect(event, '/studio', 302);
  }

  return {
    loaded: true,
  };
};

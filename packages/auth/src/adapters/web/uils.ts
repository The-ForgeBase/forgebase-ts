import { AuthToken } from '../../types.js';
import { AdminRequest } from './endpoints/admin/types.js';
import { AuthRequest } from './endpoints/auth/types.js';
import { WebAuthConfig } from './index.js';

export function extractTokenFromRequest(
  req: Request,
  config: WebAuthConfig,
): string | null {
  if (
    req.headers.get('Authorization') &&
    req.headers.get('Authorization')!.startsWith('Bearer ')
  ) {
    return req.headers.get('Authorization')!.split(' ')[1] || null;
  }

  if (req.headers.get('Cookie')) {
    const cookies = req.headers.get('Cookie')?.split('; ');
    for (const cookie of cookies || []) {
      if (cookie.startsWith(`${config.cookieName}=`)) {
        return cookie.substring(`${config.cookieName}=`.length);
      }
    }
  }

  if (req.headers.get(config.cookieName!)) {
    return req.headers.get(config.cookieName!);
  }

  return null;
}

export function extractRefreshTokenFromRequest(req: Request): string | null {
  if (req.headers.get('X-Refresh-Token')) {
    return req.headers.get('X-Refresh-Token');
  }

  if (req.headers.get('Cookie')) {
    const cookies = req.headers.get('Cookie')?.split('; ');
    for (const cookie of cookies || []) {
      if (cookie.startsWith('refreshToken=')) {
        return cookie.substring('refreshToken='.length);
      }
    }
  }

  return null;
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: any,
) {
  const cookie = `${name}=${value}; ${Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')}`;
  res.headers.set('Set-Cookie', cookie);
}

export function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

export function setAuthCookies(
  res: Response,
  token: string | AuthToken,
  config: WebAuthConfig,
) {
  if (typeof token === 'object' && token !== null) {
    setCookie(res, config.cookieName!, token.accessToken, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge || 3600000, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
    setCookie(res, 'refreshToken', token.refreshToken, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge! * 2 || 3600000 * 2, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
  } else {
    setCookie(res, config.cookieName!, token as string, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge || 3600000, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
  }
}

export function isPublic(req: AuthRequest | AdminRequest) {
  req.isPublic = true;
}

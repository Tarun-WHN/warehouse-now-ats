import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'whn_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'whn-ats-secret-key-change-in-production-2024';

// Public routes that don't need auth
const PUBLIC_ROUTES = ['/login', '/careers', '/referral', '/portal', '/api/auth', '/api/careers', '/api/portal', '/api/upload'];
const STATIC_PREFIXES = ['/_next', '/favicon', '/images', '/api/resume'];

// Role-based route access
const ROLE_ACCESS: Record<string, string[]> = {
  Admin: ['*'],
  Recruiter: ['/', '/candidates', '/jobs', '/interviews', '/upload', '/templates', '/referral', '/careers', '/settings', '/api'],
  'Hiring Manager': ['/', '/candidates', '/jobs', '/interviews', '/referral', '/careers', '/api'],
  Viewer: ['/', '/candidates', '/jobs', '/interviews', '/careers', '/api'],
  Candidate: ['/portal', '/referral', '/api/portal', '/api/auth'],
};

// Verify token using Web Crypto API (Edge-compatible)
async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role: string; type: string; exp: number } | null> {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    if (expected !== signature) return null;

    const payload = JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyTokenEdge(token);
  if (!session) {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Role-based access control
  const allowed = ROLE_ACCESS[session.role] || [];
  if (!allowed.includes('*')) {
    const hasAccess = allowed.some(route => pathname === route || pathname.startsWith(route + '/'));
    if (!hasAccess) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (session.type === 'candidate') {
        return NextResponse.redirect(new URL('/portal', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Add user info to headers
  const response = NextResponse.next();
  response.headers.set('x-user-id', session.id);
  response.headers.set('x-user-role', session.role);
  response.headers.set('x-user-type', session.type);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

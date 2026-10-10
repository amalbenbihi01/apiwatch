import { NextResponse } from 'next/server';
import { registerUser } from '@/services/auth-service';
import { createSessionCookie } from '@/lib/auth';
import { ACTIVE_TEAM_COOKIE_NAME } from '@/lib/team-context';
import { rateLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limiter';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function POST(request) {
  // 1. CSRF Origin Verification
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  // 2. Rate Limiting (5 registrations per 15 minutes per IP)
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiter.check(`auth:register:${clientIp}`, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const user = await registerUser(body);
    await createSessionCookie(user);

    if (user.activeTeamId) {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, user.activeTeamId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l’inscription' },
      { status: 400 }
    );
  }
}

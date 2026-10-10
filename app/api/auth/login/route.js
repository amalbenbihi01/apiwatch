import { NextResponse } from 'next/server';
import { loginUser } from '@/services/auth-service';
import { createSessionCookie } from '@/lib/auth';
import { rateLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limiter';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function POST(request) {
  // 1. CSRF Origin Verification
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  // 2. Rate Limiting (10 requests per 15 minutes per IP)
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiter.check(`auth:login:${clientIp}`, {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const user = await loginUser(body);
    await createSessionCookie(user);

    // Reset rate limit on successful authentication
    rateLimiter.reset(`auth:login:${clientIp}`);

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Identifiants incorrects' },
      { status: 401 }
    );
  }
}

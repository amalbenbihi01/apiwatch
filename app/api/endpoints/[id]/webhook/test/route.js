import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { testWebhookEndpoint } from '@/services/webhook-service';
import { rateLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limiter';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function POST(request, { params }) {
  // 1. CSRF Verification
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  // 2. Rate Limiting (10 requests per minute per IP)
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiter.check(`webhook:test:${clientIp}`, {
    maxRequests: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'MEMBER');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      // Body is optional if testing already saved endpoint configuration
      body = {};
    }

    const result = await testWebhookEndpoint(context.team.id, id, body);

    return NextResponse.json(
      {
        success: result.success,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    const isNotFound =
      error.message?.includes('accès refusé') || error.message?.includes('non trouvée');

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Erreur lors du test du webhook',
      },
      { status: isNotFound ? 404 : 400 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { urlSchema } from '@/services/api-service';
import { safeFetch } from '@/lib/ssrf-guard';
import { rateLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limiter';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function POST(request) {
  try {
    // 1. CSRF Verification
    const csrfCheck = verifyCsrfOrigin(request);
    if (!csrfCheck.valid) {
      return createCsrfErrorResponse(csrfCheck.error);
    }

    // 2. Authentication Verification
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 3. Rate Limiting (20 requests per minute per IP)
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimiter.check(`endpoints:check-url:${clientIp}`, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const urlValidation = urlSchema.safeParse(body?.url);

    if (!urlValidation.success) {
      const errorMessage =
        urlValidation.error.issues[0]?.message || 'L\'URL doit commencer par http:// ou https://';
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    const targetUrl = urlValidation.data;
    const httpMethod = (body?.method || 'GET').toUpperCase();

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await safeFetch(targetUrl, {
        method: httpMethod === 'HEAD' || httpMethod === 'GET' ? httpMethod : 'GET',
        headers: {
          'User-Agent': 'APIWatch-HealthCheck/1.0',
        },
        signal: controller.signal,
        timeout: 5000,
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      return NextResponse.json(
        {
          success: response.ok,
          status: response.status,
          responseTimeMs,
          message: response.ok
            ? `API accessible — ${response.status} — ${responseTimeMs} ms`
            : `API répond avec statut ${response.status} — ${responseTimeMs} ms`,
        },
        { status: 200 }
      );
    } catch (fetchError) {
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      let failureMessage = 'API inaccessible';
      if (fetchError.name === 'AbortError') {
        failureMessage = 'API inaccessible (Timeout dépassé - 5s)';
      } else if (fetchError.code === 'ENOTFOUND') {
        failureMessage = 'API inaccessible (Nom de domaine introuvable)';
      } else if (fetchError.code === 'ECONNREFUSED') {
        failureMessage = 'API inaccessible (Connexion refusée sur le serveur distant)';
      } else if (fetchError.message) {
        failureMessage = `API inaccessible (${fetchError.message})`;
      }

      return NextResponse.json(
        {
          success: false,
          status: null,
          responseTimeMs,
          message: failureMessage,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors du test de connexion' },
      { status: 500 }
    );
  }
}

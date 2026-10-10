/**
 * CSRF & Origin Verification Guard for mutable Route Handlers
 */

export function verifyCsrfOrigin(request) {
  if (!request) return { valid: true };

  const method = (request.method || 'GET').toUpperCase();
  // Safe idempotent methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');

  // Helper to extract hostname from URL
  const extractHost = (urlStr) => {
    try {
      return new URL(urlStr).host;
    } catch (_) {
      return null;
    }
  };

  // 1. Check Origin header (Primary check for POST/PUT/DELETE)
  if (originHeader) {
    const originHost = extractHost(originHeader);
    if (!originHost) {
      return { valid: false, error: 'En-tête Origin invalide (CSRF Guard)' };
    }

    // Match against current Host header
    if (hostHeader && originHost.toLowerCase() === hostHeader.toLowerCase()) {
      return { valid: true };
    }

    // Match against configured APP_URL if set
    const appUrlHost = process.env.APP_URL ? extractHost(process.env.APP_URL) : null;
    if (appUrlHost && originHost.toLowerCase() === appUrlHost.toLowerCase()) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `Origine ${originHeader} non autorisée (CSRF Guard)`,
    };
  }

  // 2. Check Referer header (Fallback if Origin not sent)
  if (refererHeader) {
    const refererHost = extractHost(refererHeader);
    if (!refererHost) {
      return { valid: false, error: 'En-tête Referer invalide (CSRF Guard)' };
    }

    if (hostHeader && refererHost.toLowerCase() === hostHeader.toLowerCase()) {
      return { valid: true };
    }

    const appUrlHost = process.env.APP_URL ? extractHost(process.env.APP_URL) : null;
    if (appUrlHost && refererHost.toLowerCase() === appUrlHost.toLowerCase()) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `Referer ${refererHeader} non autorisé (CSRF Guard)`,
    };
  }

  // 3. If both Origin and Referer are absent on a mutable request:
  // In development / local testing scripts without browser headers, allow local execution
  if (process.env.NODE_ENV !== 'production') {
    return { valid: true };
  }

  // In production, reject mutable requests that have neither Origin nor Referer
  return {
    valid: false,
    error: 'En-tête d’origine manquant pour la requête mutative (CSRF Guard)',
  };
}

/**
 * Standard HTTP 403 CSRF error response
 */
export function createCsrfErrorResponse(errorMessage) {
  return Response.json(
    { error: errorMessage || 'Accès refusé par la protection CSRF' },
    { status: 403 }
  );
}

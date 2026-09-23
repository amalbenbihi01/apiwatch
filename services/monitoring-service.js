import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { processCheckIncident } from './incident-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS — Step 15 Advanced Monitoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the final request URL by appending queryParamsJson to the base URL.
 * Preserves any query params already present in the URL.
 * Uses URL + URLSearchParams to avoid fragile string concatenation.
 * Falls back to the original URL if queryParamsJson is null, invalid, or empty.
 */
function buildRequestUrl(baseUrl, queryParamsJson) {
  if (
    !queryParamsJson ||
    typeof queryParamsJson !== 'object' ||
    Array.isArray(queryParamsJson)
  ) {
    return baseUrl;
  }

  try {
    const parsedUrl = new URL(baseUrl);
    const entries = Object.entries(queryParamsJson);
    if (entries.length === 0) return baseUrl;

    for (const [key, value] of entries) {
      if (key !== null && key !== undefined && value !== null && value !== undefined) {
        parsedUrl.searchParams.append(key, String(value));
      }
    }
    return parsedUrl.toString();
  } catch (_) {
    // URL parsing failed (shouldn't happen after Zod validation) — return original
    return baseUrl;
  }
}

/**
 * Builds the final request headers by merging system defaults with user-configured headers.
 *
 * Priority (highest wins):
 *   User-configured headers > System defaults (User-Agent)
 *
 * Rationale: the user may intentionally override User-Agent for specific APIs.
 * The User-Agent is a safe default that is always present unless explicitly overridden.
 *
 * Falls back to system headers only if headersJson is null, non-object, or an array.
 */
function buildRequestHeaders(userHeaders) {
  const systemDefaults = {
    'User-Agent': 'APIWatch-Monitoring/1.0',
  };

  if (
    !userHeaders ||
    typeof userHeaders !== 'object' ||
    Array.isArray(userHeaders)
  ) {
    return systemDefaults;
  }

  // Spread order: system first, then user — user headers take priority
  return { ...systemDefaults, ...userHeaders };
}

/**
 * Returns a copy of the headers object with sensitive values replaced by [REDACTED].
 * Used ONLY for logging — never modifies the values actually sent to the API.
 *
 * Sensitive patterns (case-insensitive key match):
 *   authorization, proxy-authorization, x-api-key, api-key,
 *   token, secret, cookie, set-cookie
 */
const SENSITIVE_HEADER_PATTERNS = [
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'token',
  'secret',
  'cookie',
  'set-cookie',
];

function redactSensitiveHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};
  const redacted = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_HEADER_PATTERNS.some((pattern) =>
      lowerKey.includes(pattern)
    );
    redacted[key] = isSensitive ? '[REDACTED]' : value;
  }
  return redacted;
}

/**
 * Builds the request body configuration.
 * - Only applicable for POST, PUT, PATCH (methods that accept a body).
 * - Auto-injects Content-Type: application/json if not already set by the user.
 * - Returns { body: string | undefined, extraHeaders: object }.
 * - Falls back to no body if bodyJson is null, empty, or not valid JSON.
 */
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

function buildRequestBody(bodyJson, method, userConfiguredHeaders) {
  if (!METHODS_WITH_BODY.has(method)) {
    return { body: undefined, extraHeaders: {} };
  }

  if (!bodyJson || typeof bodyJson !== 'string' || bodyJson.trim() === '') {
    return { body: undefined, extraHeaders: {} };
  }

  try {
    JSON.parse(bodyJson); // Validate that bodyJson is well-formed JSON

    // Check if user already defined Content-Type (case-insensitive)
    const userHasContentType = userConfiguredHeaders
      ? Object.keys(userConfiguredHeaders).some(
          (k) => k.toLowerCase() === 'content-type'
        )
      : false;

    return {
      body: bodyJson,
      extraHeaders: userHasContentType ? {} : { 'Content-Type': 'application/json' },
    };
  } catch (_) {
    console.warn('[Monitoring] bodyJson ignoré : JSON mal formé. La requête sera envoyée sans body.');
    return { body: undefined, extraHeaders: {} };
  }
}

/**
 * Clamps a timeout value to safe bounds [500ms, 30000ms].
 * Falls back to 5000ms if the value is missing or not a number.
 */
function resolveTimeout(timeoutMs) {
  const value = typeof timeoutMs === 'number' ? timeoutMs : 5000;
  return Math.min(30000, Math.max(500, value));
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE MONITORING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a health check against a single API endpoint.
 *
 * Incorporates the full request configuration stored on ApiEndpoint:
 *   - headersJson       → HTTP request headers
 *   - queryParamsJson   → appended to URL as query parameters
 *   - bodyJson          → request body (POST/PUT/PATCH only)
 *   - timeoutMs         → AbortController timeout (default 5000ms)
 *   - responseTimeThresholdMs → slow response detection (not stored in DB)
 *
 * Returns the created ApiCheck record enriched with `isSlowResponse`.
 * `isSlowResponse` is calculated at runtime and NOT persisted to the database.
 */
export async function checkApiEndpoint(endpointId, userId) {
  if (!endpointId || !userId) {
    throw new Error('Paramètres manquants');
  }

  // 1. Verify endpoint ownership — returns full ApiEndpoint object (all fields)
  const endpoint = await getApiEndpointById(userId, endpointId);

  // 2. Resolve request configuration from endpoint
  const httpMethod = (endpoint.method || 'GET').toUpperCase();
  const timeout = resolveTimeout(endpoint.timeoutMs);
  const finalUrl = buildRequestUrl(endpoint.url, endpoint.queryParamsJson);
  const mergedHeaders = buildRequestHeaders(endpoint.headersJson);
  const { body, extraHeaders } = buildRequestBody(
    endpoint.bodyJson,
    httpMethod,
    endpoint.headersJson
  );

  // Final headers composition:
  //   1. Auto-injected Content-Type (lowest priority, only if user didn't set it)
  //   2. System User-Agent default
  //   3. User-configured headers (highest priority — can override everything above)
  const requestHeaders = { ...extraHeaders, ...mergedHeaders };

  const startTime = performance.now();
  let status = 'DOWN';
  let httpStatusCode = null;
  let responseTimeMs = null;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Log request details (with secrets redacted)
    console.log(
      `[Monitoring] ${httpMethod} ${finalUrl} | timeout=${timeout}ms | headers=${JSON.stringify(redactSensitiveHeaders(requestHeaders))} | hasBody=${!!body}`
    );

    const fetchOptions = {
      method: httpMethod,
      headers: requestHeaders,
      signal: controller.signal,
    };

    // Only attach body for methods that support it
    if (body !== undefined) {
      fetchOptions.body = body;
    }

    const response = await fetch(finalUrl, fetchOptions);

    clearTimeout(timeoutId);
    const endTime = performance.now();
    responseTimeMs = Math.round(endTime - startTime);
    httpStatusCode = response.status;

    if (response.status >= 200 && response.status < 400) {
      status = 'UP';
    } else {
      status = 'DOWN';
      errorMessage = `HTTP Status ${response.status}`;
    }
  } catch (error) {
    const endTime = performance.now();
    responseTimeMs = Math.round(endTime - startTime);

    if (error.name === 'AbortError') {
      errorMessage = `Timeout (dépassement de ${timeout}ms)`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Nom de domaine introuvable (DNS failure)';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connexion refusée par le serveur distant';
    } else {
      errorMessage = error.message || 'Erreur réseau inconnue';
    }
  }

  // 3. Calculate slow response detection
  //    isSlowResponse is NOT stored in the database (no migration needed).
  //    It is calculated at runtime and returned as part of the check result.
  const isSlowResponse =
    typeof endpoint.responseTimeThresholdMs === 'number' &&
    responseTimeMs !== null &&
    responseTimeMs > endpoint.responseTimeThresholdMs;

  if (isSlowResponse) {
    console.log(
      `[Monitoring] Réponse lente détectée sur ${endpoint.name}: ${responseTimeMs}ms > seuil ${endpoint.responseTimeThresholdMs}ms`
    );
  }

  // 4. Save check result in PostgreSQL (isSlowResponse not persisted)
  const createdCheck = await prisma.apiCheck.create({
    data: {
      status,
      httpStatusCode,
      responseTimeMs,
      errorMessage,
      endpointId: endpoint.id,
    },
  });

  // 5. Trigger incident detection & resolution
  try {
    await processCheckIncident(endpoint, createdCheck);
  } catch (incidentError) {
    console.error(
      `[Incident Detection Error] Échec de la gestion d'incident pour ${endpoint.id}:`,
      incidentError
    );
  }

  // 6. Return check result enriched with isSlowResponse (runtime only, not in DB)
  return { ...createdCheck, isSlowResponse };
}

export async function getApiChecks(endpointId, userId, limit = 20) {
  if (!endpointId || !userId) {
    throw new Error('Paramètres manquants');
  }

  // Verify ownership
  await getApiEndpointById(userId, endpointId);

  return await prisma.apiCheck.findMany({
    where: { endpointId },
    orderBy: { checkedAt: 'desc' },
    take: limit,
  });
}

export async function getLatestApiCheck(endpointId, userId) {
  if (!endpointId || !userId) {
    throw new Error('Paramètres manquants');
  }

  // Verify ownership
  await getApiEndpointById(userId, endpointId);

  return await prisma.apiCheck.findFirst({
    where: { endpointId },
    orderBy: { checkedAt: 'desc' },
  });
}

export async function runAutomaticMonitoring() {
  const activeEndpoints = await prisma.apiEndpoint.findMany({
    where: { isActive: true },
    select: { id: true, userId: true, name: true, url: true },
  });

  if (activeEndpoints.length === 0) {
    console.log('[Scheduler] Aucun endpoint actif à surveiller.');
    return { totalActive: 0, successCount: 0, failureCount: 0, results: [] };
  }

  console.log(
    `[Scheduler] Début du contrôle automatique pour ${activeEndpoints.length} endpoints actifs...`
  );

  const results = await Promise.allSettled(
    activeEndpoints.map((ep) => checkApiEndpoint(ep.id, ep.userId))
  );

  let successCount = 0;
  let failureCount = 0;

  results.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      successCount++;
    } else {
      failureCount++;
      console.error(
        `[Scheduler Error] Échec du check pour l'endpoint ${activeEndpoints[index]?.id}:`,
        res.reason
      );
    }
  });

  console.log(
    `[Scheduler] Cycle terminé: ${successCount} réussis, ${failureCount} rejetés sur ${activeEndpoints.length} endpoints.`
  );

  return {
    totalActive: activeEndpoints.length,
    successCount,
    failureCount,
    results,
  };
}

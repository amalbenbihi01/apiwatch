import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { isPrivateOrReservedIp, validateSafeUrl, safeFetch } from '../lib/ssrf-guard.js';

export { isPrivateOrReservedIp };

/**
 * Validates a webhook URL for scheme and SSRF constraints using unified ssrf-guard.
 */
export async function validateWebhookUrl(rawUrl) {
  return await validateSafeUrl(rawUrl);
}

/**
 * Generates an HMAC-SHA256 signature for a raw payload string.
 */
export function generateHmacSignature(rawPayload, secret) {
  if (!secret || typeof secret !== 'string') return null;
  return crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
}

/**
 * Builds the standardized, minimal webhook payload.
 */
export function buildWebhookPayload(event, endpoint, incident = null) {
  const timestamp = new Date().toISOString();

  if (event === 'WEBHOOK_TEST') {
    return {
      event: 'WEBHOOK_TEST',
      timestamp,
      message: 'Test d’intégration webhook depuis APIWatch',
      api: {
        id: endpoint.id,
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method || 'GET',
      },
    };
  }

  return {
    event, // 'INCIDENT_OPENED' | 'INCIDENT_RESOLVED'
    timestamp,
    incident: incident
      ? {
          id: incident.id,
          status: incident.status,
          title: incident.title,
          cause: incident.cause,
          startedAt: incident.startedAt,
          resolvedAt: incident.resolvedAt || null,
        }
      : null,
    api: {
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method || 'GET',
    },
  };
}

/**
 * Sends a webhook HTTP POST request for an incident transition.
 * Strictly fail-safe: never throws, logs without exposing secrets.
 */
export async function sendIncidentWebhook(endpoint, incident, event) {
  try {
    if (!endpoint || !endpoint.webhookUrl || !endpoint.webhookUrl.trim()) {
      return null; // No webhook configured
    }

    const validation = await validateSafeUrl(endpoint.webhookUrl);
    if (!validation.valid) {
      console.warn(
        `[Webhook Warning] URL de webhook invalide ou rejetée pour l'endpoint ${endpoint.id}: ${validation.error}`
      );
      return null;
    }

    const targetUrl = validation.url;
    const payloadObject = buildWebhookPayload(event, endpoint, incident);
    const rawPayload = JSON.stringify(payloadObject);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'APIWatch-Webhook/1.0',
      'X-APIWatch-Event': event,
    };

    if (endpoint.webhookSecret && endpoint.webhookSecret.trim()) {
      const signature = generateHmacSignature(rawPayload, endpoint.webhookSecret.trim());
      headers['X-APIWatch-Signature'] = `sha256=${signature}`;
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let httpStatus = null;
    let errorMessage = null;

    try {
      const response = await safeFetch(targetUrl, {
        method: 'POST',
        headers,
        body: rawPayload,
        signal: controller.signal,
        timeout: 5000,
      });

      clearTimeout(timeoutId);
      const durationMs = Math.round(performance.now() - startTime);
      httpStatus = response.status;

      // Clean sanitized URL for logging (strip user:pass credentials if any)
      const sanitizedLogUrl = targetUrl.replace(/\/\/[^:]+:[^@]+@/, '//');

      if (response.ok) {
        console.log(
          `[Webhook Success] ${event} | endpoint: ${endpoint.id} | url: ${sanitizedLogUrl} | HTTP ${httpStatus} | ${durationMs}ms`
        );
      } else {
        console.warn(
          `[Webhook Failure] ${event} | endpoint: ${endpoint.id} | url: ${sanitizedLogUrl} | HTTP ${httpStatus} | ${durationMs}ms`
        );
      }

      return {
        success: response.ok,
        httpStatus,
        durationMs,
        error: response.ok ? null : `HTTP Status ${httpStatus}`,
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const durationMs = Math.round(performance.now() - startTime);
      errorMessage = fetchErr.name === 'AbortError' ? 'Timeout (dépassement de 5000ms)' : fetchErr.message;

      const sanitizedLogUrl = targetUrl.replace(/\/\/[^:]+:[^@]+@/, '//');
      console.error(
        `[Webhook Error] ${event} | endpoint: ${endpoint.id} | url: ${sanitizedLogUrl} | ${errorMessage} | ${durationMs}ms`
      );

      return {
        success: false,
        httpStatus: null,
        durationMs,
        error: errorMessage,
      };
    }
  } catch (topError) {
    console.error(`[Webhook Fatal Error] Erreur inattendue dans sendIncidentWebhook:`, topError.message);
    return null;
  }
}

/**
 * Interactive test endpoint for the "Tester le webhook" button in the frontend.
 * Sends a WEBHOOK_TEST event without creating any Incident or ApiCheck.
 */
export async function testWebhookEndpoint(userId, endpointId, options = {}) {
  if (!userId) throw new Error('Utilisateur non identifié');

  let endpoint = null;
  if (endpointId) {
    endpoint = await getApiEndpointById(userId, endpointId);
  } else {
    endpoint = {
      id: 'mock-test-id',
      name: options.name || 'API de Test',
      url: options.url || 'https://api.example.com',
      method: options.method || 'GET',
    };
  }

  const targetWebhookUrl = options.webhookUrl || endpoint.webhookUrl;
  const targetSecret = options.webhookSecret !== undefined ? options.webhookSecret : endpoint.webhookSecret;

  if (!targetWebhookUrl || !targetWebhookUrl.trim()) {
    throw new Error('Veuillez renseigner une URL de webhook valide.');
  }

  const validation = await validateSafeUrl(targetWebhookUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const payloadObject = buildWebhookPayload('WEBHOOK_TEST', endpoint);
  const rawPayload = JSON.stringify(payloadObject);

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'APIWatch-Webhook/1.0',
    'X-APIWatch-Event': 'WEBHOOK_TEST',
  };

  if (targetSecret && targetSecret.trim()) {
    const signature = generateHmacSignature(rawPayload, targetSecret.trim());
    headers['X-APIWatch-Signature'] = `sha256=${signature}`;
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await safeFetch(validation.url, {
      method: 'POST',
      headers,
      body: rawPayload,
      signal: controller.signal,
      timeout: 5000,
    });

    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);

    return {
      success: response.ok,
      httpStatus: response.status,
      responseTimeMs: durationMs,
      message: response.ok
        ? `Webhook délivré avec succès — HTTP ${response.status} (${durationMs} ms)`
        : `Webhook a répondu avec statut HTTP ${response.status} (${durationMs} ms)`,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);
    const errorMsg = err.name === 'AbortError' ? 'Timeout dépassé (5000ms)' : (err.message || 'Erreur réseau');

    return {
      success: false,
      httpStatus: null,
      responseTimeMs: durationMs,
      message: `Échec de distribution : ${errorMsg}`,
    };
  }
}

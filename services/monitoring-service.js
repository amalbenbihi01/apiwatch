import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { processCheckIncident } from './incident-service.js';

export async function checkApiEndpoint(endpointId, userId) {
  if (!endpointId || !userId) {
    throw new Error('Paramètres manquants');
  }

  // 1. Verify endpoint ownership
  const endpoint = await getApiEndpointById(userId, endpointId);

  const startTime = performance.now();
  let status = 'DOWN';
  let httpStatusCode = null;
  let responseTimeMs = null;
  let errorMessage = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const httpMethod = (endpoint.method || 'GET').toUpperCase();

    const response = await fetch(endpoint.url, {
      method: httpMethod === 'HEAD' || httpMethod === 'GET' ? httpMethod : 'GET',
      headers: {
        'User-Agent': 'APIWatch-Monitoring/1.0',
      },
      signal: controller.signal,
    });

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
      errorMessage = 'Timeout (dépassement de 5s)';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Nom de domaine introuvable (DNS failure)';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connexion refusée par le serveur distant';
    } else {
      errorMessage = error.message || 'Erreur réseau inconnue';
    }
  }

  // Save check result in PostgreSQL
  const createdCheck = await prisma.apiCheck.create({
    data: {
      status,
      httpStatusCode,
      responseTimeMs,
      errorMessage,
      endpointId: endpoint.id,
    },
  });

  // Automatically trigger Incident detection & resolution
  try {
    await processCheckIncident(endpoint, createdCheck);
  } catch (incidentError) {
    console.error(`[Incident Detection Error] Échec de la gestion d'incident pour ${endpoint.id}:`, incidentError);
  }

  return createdCheck;
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

  console.log(`[Scheduler] Début du contrôle automatique pour ${activeEndpoints.length} endpoints actifs...`);

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
      console.error(`[Scheduler Error] Échec du check pour l'endpoint ${activeEndpoints[index]?.id}:`, res.reason);
    }
  });

  console.log(`[Scheduler] Cycle terminé: ${successCount} réussis, ${failureCount} rejetés sur ${activeEndpoints.length} endpoints.`);

  return {
    totalActive: activeEndpoints.length,
    successCount,
    failureCount,
    results,
  };
}

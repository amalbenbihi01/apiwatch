import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { sendIncidentNotification } from './notification-service.js';
import { createInAppNotification } from './in-app-notification-service.js';
import { sendIncidentWebhook } from './webhook-service.js';

export async function processCheckIncident(endpoint, checkResult) {
  if (!endpoint || !endpoint.id || !endpoint.userId) {
    throw new Error('Endpoint invalide');
  }

  const endpointId = endpoint.id;
  const userId = endpoint.userId; // Always derived from endpoint ownership
  const unhealthyThreshold = Math.max(1, endpoint.unhealthyThreshold ?? 1);
  const recoveryThreshold = Math.max(1, endpoint.recoveryThreshold ?? 1);

  if (checkResult.status === 'DOWN') {
    // 1. Check if an OPEN incident already exists for this endpoint (anti-spam)
    const existingOpenIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: 'OPEN',
      },
    });

    if (existingOpenIncident) {
      return existingOpenIncident; // Keep existing open incident, no repeat incident/email/webhook
    }

    // 2. Threshold Evaluation (Calculate consecutive failures from recent ApiChecks)
    const recentChecks = await prisma.apiCheck.findMany({
      where: { endpointId },
      orderBy: { checkedAt: 'desc' },
      take: unhealthyThreshold,
      select: { status: true },
    });

    let consecutiveFailures = 0;
    for (const check of recentChecks) {
      if (check.status === 'DOWN') {
        consecutiveFailures++;
      } else {
        break; // Consecutive sequence broken
      }
    }

    if (consecutiveFailures < unhealthyThreshold) {
      console.log(
        `[Incident Service] Échec ${consecutiveFailures}/${unhealthyThreshold} pour ${endpoint.name} — Seuil non atteint, aucun incident créé.`
      );
      return null;
    }

    console.log(
      `[Incident Service] Seuil d'échecs atteint (${consecutiveFailures}/${unhealthyThreshold}) pour ${endpoint.name} — Création d'un incident OPEN.`
    );

    // 3. Try creating a new OPEN incident
    let createdIncident = null;
    try {
      createdIncident = await prisma.incident.create({
        data: {
          endpointId,
          userId,
          status: 'OPEN',
          startedAt: new Date(),
          title: `Incident sur ${endpoint.name}`,
          cause: checkResult.errorMessage || `Code HTTP ${checkResult.httpStatusCode || 'Indisponible'}`,
        },
      });
    } catch (err) {
      // Race condition safety
      createdIncident = await prisma.incident.findFirst({
        where: { endpointId, status: 'OPEN' },
      });
    }

    if (!createdIncident) return null;

    // 4. Trigger Email, In-App & Webhook Notifications in isolated try/catch blocks
    // Email Notification
    try {
      await sendIncidentNotification(createdIncident, endpoint, 'INCIDENT_OPEN');
    } catch (emailErr) {
      console.error(`[Email Trigger Error] OPEN ${createdIncident.id}:`, emailErr);
    }

    // In-App Notification
    try {
      await createInAppNotification(createdIncident, 'INCIDENT_OPEN');
    } catch (inAppErr) {
      console.error(`[InApp Trigger Error] OPEN ${createdIncident.id}:`, inAppErr);
    }

    // Webhook Notification
    try {
      await sendIncidentWebhook(endpoint, createdIncident, 'INCIDENT_OPEN');
    } catch (webhookErr) {
      console.error(`[Webhook Trigger Error] OPEN ${createdIncident.id}:`, webhookErr);
    }

    return createdIncident;
  } else if (checkResult.status === 'UP') {
    // 1. Check if there is an OPEN incident for this endpoint
    const existingOpenIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: 'OPEN',
      },
    });

    if (!existingOpenIncident) {
      return null; // All healthy, nothing to resolve
    }

    // 2. Threshold Evaluation (Calculate consecutive successes from recent ApiChecks)
    const recentChecks = await prisma.apiCheck.findMany({
      where: { endpointId },
      orderBy: { checkedAt: 'desc' },
      take: recoveryThreshold,
      select: { status: true },
    });

    let consecutiveSuccesses = 0;
    for (const check of recentChecks) {
      if (check.status === 'UP') {
        consecutiveSuccesses++;
      } else {
        break; // Consecutive sequence broken
      }
    }

    if (consecutiveSuccesses < recoveryThreshold) {
      console.log(
        `[Incident Service] Succès ${consecutiveSuccesses}/${recoveryThreshold} pour ${endpoint.name} — Seuil de récupération non atteint.`
      );
      return null;
    }

    console.log(
      `[Incident Service] Seuil de récupération atteint (${consecutiveSuccesses}/${recoveryThreshold}) pour ${endpoint.name} — Résolution de l'incident.`
    );

    // Resolve incident
    const resolvedIncident = await prisma.incident.update({
      where: { id: existingOpenIncident.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    // 3. Trigger Email, In-App & Webhook Notifications in isolated try/catch blocks
    // Email Notification
    try {
      await sendIncidentNotification(resolvedIncident, endpoint, 'INCIDENT_RESOLVED');
    } catch (emailErr) {
      console.error(`[Email Trigger Error] RESOLVED ${resolvedIncident.id}:`, emailErr);
    }

    // In-App Notification
    try {
      await createInAppNotification(resolvedIncident, 'INCIDENT_RESOLVED');
    } catch (inAppErr) {
      console.error(`[InApp Trigger Error] RESOLVED ${resolvedIncident.id}:`, inAppErr);
    }

    // Webhook Notification
    try {
      await sendIncidentWebhook(endpoint, resolvedIncident, 'INCIDENT_RESOLVED');
    } catch (webhookErr) {
      console.error(`[Webhook Trigger Error] RESOLVED ${resolvedIncident.id}:`, webhookErr);
    }

    return resolvedIncident;
  }

  return null;
}

export async function getTeamIncidents(teamId, statusFilter = null) {
  if (!teamId) throw new Error('Équipe non identifiée');

  const whereCondition = {
    endpoint: {
      teamId,
    },
  };

  if (statusFilter) {
    whereCondition.status = statusFilter.toUpperCase();
  }

  return await prisma.incident.findMany({
    where: whereCondition,
    include: {
      endpoint: {
        select: {
          id: true,
          name: true,
          url: true,
          method: true,
          teamId: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getUserIncidents(userId, statusFilter = null) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const whereCondition = {
    endpoint: {
      team: {
        members: {
          some: { userId },
        },
      },
    },
  };

  if (statusFilter) {
    whereCondition.status = statusFilter.toUpperCase();
  }

  return await prisma.incident.findMany({
    where: whereCondition,
    include: {
      endpoint: {
        select: {
          id: true,
          name: true,
          url: true,
          method: true,
          teamId: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getEndpointIncidents(endpointId, teamIdOrUserId) {
  if (!endpointId || !teamIdOrUserId) throw new Error('Paramètres manquants');

  return await prisma.incident.findMany({
    where: {
      endpointId,
      endpoint: {
        OR: [
          { teamId: teamIdOrUserId },
          { userId: teamIdOrUserId },
        ],
      },
    },
    orderBy: { startedAt: 'desc' },
  });
}

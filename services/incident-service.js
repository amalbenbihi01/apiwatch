import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { sendIncidentNotification } from './notification-service.js';

export async function processCheckIncident(endpoint, checkResult) {
  if (!endpoint || !endpoint.id || !endpoint.userId) {
    throw new Error('Endpoint invalide');
  }

  const endpointId = endpoint.id;
  const userId = endpoint.userId; // Always derived from endpoint ownership

  if (checkResult.status === 'DOWN') {
    // Check if an OPEN incident already exists for this endpoint
    const existingOpenIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: 'OPEN',
      },
    });

    if (existingOpenIncident) {
      return existingOpenIncident; // Anti-duplicate: keep existing open incident
    }

    // Try creating a new OPEN incident
    let createdIncident = null;
    try {
      createdIncident = await prisma.incident.create({
        data: {
          status: 'OPEN',
          title: `Panne sur ${endpoint.name}`,
          cause: checkResult.errorMessage || `HTTP Status ${checkResult.httpStatusCode || 'Inaccessible'}`,
          startedAt: new Date(),
          endpointId,
          userId,
        },
      });
    } catch (err) {
      // Handle PostgreSQL partial unique index violation in concurrent race conditions
      if (err.code === 'P2002') {
        return await prisma.incident.findFirst({
          where: {
            endpointId,
            status: 'OPEN',
          },
        });
      }
      throw err;
    }

    // Trigger Notification for INCIDENT_OPEN in isolated try/catch block
    if (createdIncident) {
      try {
        await sendIncidentNotification(createdIncident, 'INCIDENT_OPEN');
      } catch (notifErr) {
        console.error(`[Notification Trigger Error] Échec pour l'incident OPEN ${createdIncident.id}:`, notifErr);
      }
    }

    return createdIncident;
  } else if (checkResult.status === 'UP') {
    // Check if there is an OPEN incident that needs resolution
    const existingOpenIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: 'OPEN',
      },
    });

    if (existingOpenIncident) {
      const resolvedIncident = await prisma.incident.update({
        where: { id: existingOpenIncident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      // Trigger Notification for INCIDENT_RESOLVED in isolated try/catch block
      try {
        await sendIncidentNotification(resolvedIncident, 'INCIDENT_RESOLVED');
      } catch (notifErr) {
        console.error(`[Notification Trigger Error] Échec pour l'incident RESOLVED ${resolvedIncident.id}:`, notifErr);
      }

      return resolvedIncident;
    }

    return null;
  }
}

export async function getUserIncidents(userId, statusFilter = null) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const whereCondition = { userId };
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
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getEndpointIncidents(endpointId, userId) {
  if (!endpointId || !userId) throw new Error('Paramètres manquants');

  // Verify ownership
  await getApiEndpointById(userId, endpointId);

  return await prisma.incident.findMany({
    where: {
      endpointId,
      userId,
    },
    orderBy: { startedAt: 'desc' },
  });
}

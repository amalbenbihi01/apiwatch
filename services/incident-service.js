import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';
import { sendIncidentNotification } from './notification-service.js';
import { createInAppNotification } from './in-app-notification-service.js';

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

    // Trigger Email & In-App Notifications in isolated try/catch blocks
    if (createdIncident) {
      // 1. Email Notification
      try {
        await sendIncidentNotification(createdIncident, 'INCIDENT_OPEN');
      } catch (emailErr) {
        console.error(`[Email Trigger Error] OPEN ${createdIncident.id}:`, emailErr);
      }

      // 2. In-App Notification
      try {
        await createInAppNotification(createdIncident, 'INCIDENT_OPEN');
      } catch (inAppErr) {
        console.error(`[InApp Trigger Error] OPEN ${createdIncident.id}:`, inAppErr);
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

      // Trigger Email & In-App Notifications in isolated try/catch blocks
      // 1. Email Notification
      try {
        await sendIncidentNotification(resolvedIncident, 'INCIDENT_RESOLVED');
      } catch (emailErr) {
        console.error(`[Email Trigger Error] RESOLVED ${resolvedIncident.id}:`, emailErr);
      }

      // 2. In-App Notification
      try {
        await createInAppNotification(resolvedIncident, 'INCIDENT_RESOLVED');
      } catch (inAppErr) {
        console.error(`[InApp Trigger Error] RESOLVED ${resolvedIncident.id}:`, inAppErr);
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

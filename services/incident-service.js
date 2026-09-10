import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';

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
    try {
      return await prisma.incident.create({
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
  } else if (checkResult.status === 'UP') {
    // Check if there is an OPEN incident that needs resolution
    const existingOpenIncident = await prisma.incident.findFirst({
      where: {
        endpointId,
        status: 'OPEN',
      },
    });

    if (existingOpenIncident) {
      return await prisma.incident.update({
        where: { id: existingOpenIncident.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
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

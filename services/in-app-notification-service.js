import { prisma } from '../lib/prisma.js';

export async function createInAppNotification(incidentInput, type) {
  try {
    if (!incidentInput || !incidentInput.id || !type) {
      return null;
    }

    // Fetch full incident details including endpoint and user
    const incident = await prisma.incident.findUnique({
      where: { id: incidentInput.id },
      include: {
        endpoint: true,
      },
    });

    if (!incident || !incident.endpoint) {
      return null;
    }

    const { endpoint } = incident;

    // Check if duplicate notification already exists
    const existingNotif = await prisma.inAppNotification.findUnique({
      where: {
        incidentId_type: {
          incidentId: incident.id,
          type,
        },
      },
    });

    if (existingNotif) {
      return existingNotif;
    }

    let title = '';
    let message = '';

    if (type === 'INCIDENT_OPEN') {
      title = `🔴 Panne détectée : ${endpoint.name}`;
      message = `L'API "${endpoint.name}" (${endpoint.url}) est indisponible. Cause : ${incident.cause || 'Inaccessible'}.`;
    } else if (type === 'INCIDENT_RESOLVED') {
      const durationMs = incident.resolvedAt
        ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()
        : 0;
      const durationMin = Math.max(1, Math.round(durationMs / 60000));
      title = `🟢 Rétablissement : ${endpoint.name}`;
      message = `L'API "${endpoint.name}" est de nouveau en ligne. Panne résolue après ${durationMin} min.`;
    } else {
      return null;
    }

    return await prisma.inAppNotification.create({
      data: {
        type,
        title,
        message,
        isRead: false,
        endpointId: endpoint.id,
        incidentId: incident.id,
        userId: incident.userId,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      // Gracefully handle PostgreSQL unique index collisions in race conditions
      return await prisma.inAppNotification.findUnique({
        where: {
          incidentId_type: {
            incidentId: incidentInput.id,
            type,
          },
        },
      });
    }
    console.error('[In-App Notification Error] Échec de création:', err);
    return null; // Fail-Safe: Never throws up to caller
  }
}

export async function getUserInAppNotifications(userId, { page = 1, limit = 10, unreadOnly = false } = {}) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const whereCondition = { userId };
  if (unreadOnly) {
    whereCondition.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.inAppNotification.findMany({
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.inAppNotification.count({ where: whereCondition }),
  ]);

  return {
    notifications,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const unreadCount = await prisma.inAppNotification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return { unreadCount };
}

export async function markNotificationAsRead(notificationId, userId) {
  if (!notificationId || !userId) throw new Error('Paramètres manquants');

  const result = await prisma.inAppNotification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error('Notification introuvable ou accès refusé');
  }

  return { success: true };
}

export async function markAllNotificationsAsRead(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const result = await prisma.inAppNotification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true, count: result.count };
}

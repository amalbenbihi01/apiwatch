import { prisma } from '../lib/prisma.js';
import { getEndpointAnalytics } from './analytics-service.js';

/**
 * 1. getStatusPageConfig(userId) - Fonction PRIVÉE
 * Récupère la configuration de la status page et la liste des APIs de l'utilisateur.
 */
export async function getStatusPageConfig(userId) {
  if (!userId) {
    throw new Error('Utilisateur non identifié');
  }

  const statusPage = await prisma.statusPage.findUnique({
    where: { userId },
  });

  const endpoints = await prisma.apiEndpoint.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      method: true,
      isActive: true,
      isPublic: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const defaultSlug = `status-${userId.slice(0, 8)}`;

  return {
    statusPage: statusPage ? {
      id: statusPage.id,
      slug: statusPage.slug,
      title: statusPage.title,
      description: statusPage.description,
      isEnabled: statusPage.isEnabled,
      createdAt: statusPage.createdAt,
      updatedAt: statusPage.updatedAt,
    } : {
      slug: defaultSlug,
      title: 'System Status',
      description: null,
      isEnabled: false,
    },
    endpoints,
  };
}

/**
 * 2. updateStatusPageConfig(userId, data) - Fonction PRIVÉE
 * Valide les données, gère l'unicité du slug et met à jour la configuration ainsi que l'état isPublic des endpoints.
 */
export async function updateStatusPageConfig(userId, data) {
  if (!userId) {
    throw new Error('Utilisateur non identifié');
  }

  const { isEnabled, slug, title, description, publishedEndpointIds } = data || {};

  // Clean and validate slug
  const cleanSlug = typeof slug === 'string'
    ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    : '';

  if (!cleanSlug || cleanSlug.length < 3 || cleanSlug.length > 50) {
    throw new Error('Le slug doit contenir entre 3 et 50 caractères alphanumériques ou tirets');
  }

  // Check slug uniqueness across OTHER users
  const existingSlug = await prisma.statusPage.findFirst({
    where: {
      slug: cleanSlug,
      NOT: { userId },
    },
  });

  if (existingSlug) {
    throw new Error('Ce slug est déjà utilisé par une autre Status Page');
  }

  // Execute transaction for atomic update of StatusPage and ApiEndpoint.isPublic
  const result = await prisma.$transaction(async (tx) => {
    // 1. Upsert StatusPage record
    const updatedPage = await tx.statusPage.upsert({
      where: { userId },
      create: {
        userId,
        slug: cleanSlug,
        title: title && typeof title === 'string' ? title.trim() : 'System Status',
        description: description && typeof description === 'string' ? description.trim() : null,
        isEnabled: Boolean(isEnabled),
      },
      update: {
        slug: cleanSlug,
        title: title && typeof title === 'string' ? title.trim() : 'System Status',
        description: description && typeof description === 'string' ? description.trim() : null,
        isEnabled: Boolean(isEnabled),
      },
    });

    // 2. Reset all endpoints for this user to isPublic: false
    await tx.apiEndpoint.updateMany({
      where: { userId },
      data: { isPublic: false },
    });

    // 3. Mark selected publishedEndpointIds belonging strictly to userId as isPublic: true
    if (Array.isArray(publishedEndpointIds) && publishedEndpointIds.length > 0) {
      await tx.apiEndpoint.updateMany({
        where: {
          userId,
          id: { in: publishedEndpointIds },
        },
        data: { isPublic: true },
      });
    }

    return updatedPage;
  });

  return getStatusPageConfig(userId);
}

/**
 * 3. getPublicStatusPageData(slug) - Fonction PUBLIQUE (Unauthenticated)
 * Récupère les données publiques sanitisées pour l'URL /status/[slug].
 */
export async function getPublicStatusPageData(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('StatusPageDisabledOrNotFound');
  }

  const cleanSlug = slug.trim().toLowerCase();

  // 1. Find StatusPage by slug
  const statusPage = await prisma.statusPage.findUnique({
    where: { slug: cleanSlug },
  });

  if (!statusPage || !statusPage.isEnabled) {
    throw new Error('StatusPageDisabledOrNotFound');
  }

  const ownerUserId = statusPage.userId;

  // 2. Fetch public and active endpoints for the status page owner
  const publicEndpoints = await prisma.apiEndpoint.findMany({
    where: {
      userId: ownerUserId,
      isPublic: true,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      method: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Parallel fetching of latest checks & 24h analytics to avoid N+1 issues
  const servicesData = await Promise.all(
    publicEndpoints.map(async (ep) => {
      const latestCheck = await prisma.apiCheck.findFirst({
        where: { endpointId: ep.id },
        orderBy: { checkedAt: 'desc' },
        select: {
          status: true,
          httpStatusCode: true,
          responseTimeMs: true,
          checkedAt: true,
        },
      });

      let uptime24h = null;
      try {
        const analytics = await getEndpointAnalytics(ep.id, ownerUserId, '24h');
        uptime24h = analytics.summary?.uptimePercentage ?? null;
      } catch (err) {
        uptime24h = null;
      }

      return {
        id: ep.id,
        name: ep.name,
        method: ep.method,
        status: latestCheck ? latestCheck.status : 'NO_DATA',
        responseTimeMs: latestCheck ? latestCheck.responseTimeMs : null,
        httpStatusCode: latestCheck ? latestCheck.httpStatusCode : null,
        checkedAt: latestCheck ? latestCheck.checkedAt.toISOString() : null,
        uptime24h,
      };
    })
  );

  // 4. Calculate Global System Status
  let globalStatus = 'NO_DATA';
  const checkedServices = servicesData.filter((s) => s.status === 'UP' || s.status === 'DOWN');

  if (publicEndpoints.length > 0 && checkedServices.length > 0) {
    const upCount = checkedServices.filter((s) => s.status === 'UP').length;
    const downCount = checkedServices.filter((s) => s.status === 'DOWN').length;

    if (downCount === 0 && upCount > 0) {
      globalStatus = 'ALL_OPERATIONAL';
    } else if (downCount > 0 && upCount > 0) {
      globalStatus = 'DEGRADED';
    } else if (downCount > 0 && upCount === 0) {
      globalStatus = 'MAJOR_OUTAGE';
    }
  }

  // 5. Fetch and sanitise public incidents for active public endpoints
  const publicEndpointIds = publicEndpoints.map((ep) => ep.id);
  const incidents = publicEndpointIds.length > 0
    ? await prisma.incident.findMany({
        where: {
          endpointId: { in: publicEndpointIds },
        },
        include: {
          endpoint: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 15,
      })
    : [];

  const publicIncidentsDTO = incidents.map((inc) => {
    let durationFormatted = 'En cours';
    if (inc.resolvedAt) {
      const durationMs = new Date(inc.resolvedAt).getTime() - new Date(inc.startedAt).getTime();
      const minutes = Math.max(1, Math.round(durationMs / 60000));
      const hours = Math.floor(minutes / 60);
      durationFormatted = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
    }

    // Sanitise cause field: hide private URLs, headers, stack traces or tokens
    let sanitizedCause = 'Incident de service';
    if (inc.cause) {
      if (inc.cause.includes('Timeout')) sanitizedCause = 'Délai d\'attente dépassé (Timeout)';
      else if (inc.cause.includes('HTTP Status')) sanitizedCause = inc.cause.replace(/[^a-zA-Z0-9\s]/g, '');
      else if (inc.cause.includes('DNS')) sanitizedCause = 'Erreur de résolution DNS';
      else if (inc.cause.includes('refusée')) sanitizedCause = 'Connexion refusée par le serveur distant';
      else sanitizedCause = 'Indisponibilité du service';
    }

    return {
      title: inc.title || `Panne sur ${inc.endpoint.name}`,
      serviceName: inc.endpoint.name,
      status: inc.status,
      startedAt: inc.startedAt.toISOString(),
      resolvedAt: inc.resolvedAt ? inc.resolvedAt.toISOString() : null,
      duration: durationFormatted,
      cause: sanitizedCause,
    };
  });

  // 6. Return Clean Sanitised Public DTO (Zero sensitive private fields)
  return {
    title: statusPage.title,
    description: statusPage.description,
    globalStatus,
    services: servicesData,
    incidents: publicIncidentsDTO,
  };
}

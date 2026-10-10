import { prisma } from '../lib/prisma.js';

/**
 * Builds the Prisma where clause for ApiCheck filtering scoped to a team.
 */
function buildChecksWhereClause(teamId, filters = {}) {
  if (!teamId) {
    throw new Error('Équipe non identifiée');
  }

  const {
    endpointId,
    status,
    httpCode,
    search,
    period,
  } = filters;

  const where = {
    endpoint: {
      teamId,
    },
  };

  // Endpoint filter
  if (endpointId && endpointId.trim() && endpointId !== 'all') {
    where.endpointId = endpointId.trim();
  }

  // Status filter (UP, DOWN)
  if (status && (status === 'UP' || status === 'DOWN')) {
    where.status = status;
  }

  // HTTP code filter (exact or class: 2xx, 3xx, 4xx, 5xx)
  if (httpCode && httpCode.trim() && httpCode !== 'all') {
    const code = httpCode.trim().toLowerCase();
    if (code === '2xx') {
      where.httpStatusCode = { gte: 200, lte: 299 };
    } else if (code === '3xx') {
      where.httpStatusCode = { gte: 300, lte: 399 };
    } else if (code === '4xx') {
      where.httpStatusCode = { gte: 400, lte: 499 };
    } else if (code === '5xx') {
      where.httpStatusCode = { gte: 500, lte: 599 };
    } else {
      const parsed = parseInt(code, 10);
      if (!isNaN(parsed)) {
        where.httpStatusCode = parsed;
      }
    }
  }

  // Period filter
  if (period && period !== 'all') {
    const now = new Date();
    let durationMs = 0;
    if (period === '24h') durationMs = 24 * 60 * 60 * 1000;
    else if (period === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
    else if (period === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;

    if (durationMs > 0) {
      where.checkedAt = {
        gte: new Date(now.getTime() - durationMs),
      };
    }
  }

  // Search filter (Endpoint name, url, error message)
  if (search && search.trim()) {
    const q = search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { endpoint: { name: { contains: q, mode: 'insensitive' } } },
          { endpoint: { url: { contains: q, mode: 'insensitive' } } },
          { errorMessage: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  return where;
}

/**
 * Retrieves paginated logs / ApiChecks for a team with search and filtering.
 */
export async function getPaginatedApiChecks(teamId, filters = {}) {
  const where = buildChecksWhereClause(teamId, filters);

  const parsedPage = Number.parseInt(filters.page, 10);
  const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);

  const parsedLimit = Number.parseInt(filters.limit, 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 20));

  const skip = (page - 1) * limit;

  const [totalCount, checks] = await Promise.all([
    prisma.apiCheck.count({ where }),
    prisma.apiCheck.findMany({
      where,
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
      orderBy: { checkedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    checks: checks.map((c) => ({
      id: c.id,
      endpointId: c.endpointId,
      endpointName: c.endpoint?.name || 'Endpoint inconnu',
      endpointUrl: c.endpoint?.url || '',
      endpointMethod: c.endpoint?.method || 'GET',
      status: c.status,
      httpStatusCode: c.httpStatusCode,
      responseTimeMs: c.responseTimeMs,
      errorMessage: c.errorMessage,
      checkedAt: c.checkedAt,
      createdAt: c.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Retrieves single check detail scoped to team (Zero IDOR, no leak of secrets).
 */
export async function getApiCheckDetail(teamId, checkId) {
  if (!teamId || !checkId) {
    throw new Error('Paramètres manquants');
  }

  const check = await prisma.apiCheck.findFirst({
    where: {
      id: checkId,
      endpoint: {
        teamId,
      },
    },
    include: {
      endpoint: {
        select: {
          id: true,
          name: true,
          url: true,
          method: true,
          timeoutMs: true,
          responseTimeThresholdMs: true,
          teamId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!check) {
    throw new Error('Log de contrôle introuvable ou accès refusé');
  }

  return {
    id: check.id,
    endpointId: check.endpointId,
    endpoint: check.endpoint,
    status: check.status,
    httpStatusCode: check.httpStatusCode,
    responseTimeMs: check.responseTimeMs,
    errorMessage: check.errorMessage,
    checkedAt: check.checkedAt,
    createdAt: check.createdAt,
  };
}

/**
 * Exports logs to CSV formatted string with strictly bounded limit (1..1000).
 */
export async function exportApiChecksToCsv(teamId, filters = {}) {
  const where = buildChecksWhereClause(teamId, filters);

  const requestedLimit = filters.limit;
  const parsedLimit = Number.parseInt(requestedLimit, 10);
  const limit = Math.min(
    1000,
    Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 1000)
  );

  const checks = await prisma.apiCheck.findMany({
    where,
    include: {
      endpoint: {
        select: {
          name: true,
          url: true,
          method: true,
        },
      },
    },
    orderBy: { checkedAt: 'desc' },
    take: limit,
  });

  // CSV escape helper
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'id',
    'endpoint_name',
    'endpoint_method',
    'endpoint_url',
    'status',
    'http_status_code',
    'response_time_ms',
    'error_message',
    'checked_at',
  ];

  const rows = checks.map((c) => [
    escapeCsv(c.id),
    escapeCsv(c.endpoint?.name || ''),
    escapeCsv(c.endpoint?.method || ''),
    escapeCsv(c.endpoint?.url || ''),
    escapeCsv(c.status),
    escapeCsv(c.httpStatusCode !== null ? c.httpStatusCode : ''),
    escapeCsv(c.responseTimeMs !== null ? c.responseTimeMs : ''),
    escapeCsv(c.errorMessage || ''),
    escapeCsv(c.checkedAt ? new Date(c.checkedAt).toISOString() : ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  return {
    csvContent,
    count: checks.length,
    filename: `apiwatch-logs-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';

/**
 * Calculates a percentile for a given array of numeric values using the Nearest-Rank method.
 *
 * Algorithm:
 * 1. Filter out null, undefined, and non-numeric / NaN values.
 * 2. Sort values in ascending numerical order.
 * 3. If array is empty, return null.
 * 4. Rank = ceil(p * N) where p is between 0 and 1 (e.g., 0.95 for P95).
 * 5. 0-based Index = max(0, min(N - 1, Rank - 1)).
 * 6. Return sorted[Index].
 *
 * Guaranteed to produce deterministic results for N=1, N=2, N<20, and large N.
 */
export function calculatePercentile(values, percentile = 0.95) {
  if (!Array.isArray(values)) return null;

  const validNumbers = values
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  const n = validNumbers.length;
  if (n === 0) return null;
  if (n === 1) return validNumbers[0];

  const rank = Math.ceil(percentile * n);
  const index = Math.max(0, Math.min(n - 1, rank - 1));

  return validNumbers[index];
}

/**
 * Calculates the median (50th percentile) for a given array of numeric values.
 * If N is odd, returns the middle element.
 * If N is even, returns the average of the two middle elements rounded to nearest integer.
 */
export function calculateMedian(values) {
  if (!Array.isArray(values)) return null;

  const validNumbers = values
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b);

  const n = validNumbers.length;
  if (n === 0) return null;
  if (n === 1) return validNumbers[0];

  const mid = Math.floor(n / 2);
  if (n % 2 !== 0) {
    return validNumbers[mid];
  } else {
    return Math.round((validNumbers[mid - 1] + validNumbers[mid]) / 2);
  }
}

/**
 * Calculates Mean Time To Resolution (MTTR) strictly from resolved incidents.
 * OPEN incidents are excluded.
 */
export function calculateMttr(incidents) {
  if (!Array.isArray(incidents)) {
    return { mttrMs: null, mttrFormatted: 'N/A', resolvedCount: 0 };
  }

  const resolvedIncidents = incidents.filter(
    (inc) => inc.status === 'RESOLVED' && inc.startedAt && inc.resolvedAt
  );

  if (resolvedIncidents.length === 0) {
    return { mttrMs: null, mttrFormatted: 'N/A', resolvedCount: 0 };
  }

  const durations = resolvedIncidents.map((inc) => {
    const start = new Date(inc.startedAt).getTime();
    const end = new Date(inc.resolvedAt).getTime();
    return Math.max(0, end - start);
  });

  const totalDurationMs = durations.reduce((a, b) => a + b, 0);
  const mttrMs = Math.round(totalDurationMs / durations.length);

  return {
    mttrMs,
    mttrFormatted: formatDurationMs(mttrMs),
    resolvedCount: resolvedIncidents.length,
  };
}

export async function getEndpointAnalytics(endpointId, teamIdOrUserId, period = '24h') {
  if (!endpointId || !teamIdOrUserId) {
    throw new Error('Paramètres manquants');
  }

  const validPeriods = ['24h', '7d', '30d'];
  if (!validPeriods.includes(period)) {
    throw new Error('Période invalide. Les périodes acceptées sont 24h, 7d, 30d');
  }

  // Verify endpoint ownership within team or user
  const endpoint = await prisma.apiEndpoint.findFirst({
    where: {
      id: endpointId,
      OR: [
        { teamId: teamIdOrUserId },
        { userId: teamIdOrUserId },
      ],
    },
  });

  if (!endpoint) {
    throw new Error('API non trouvée ou accès refusé');
  }

  const now = new Date();
  let durationMs = 24 * 60 * 60 * 1000;

  if (period === '7d') {
    durationMs = 7 * 24 * 60 * 60 * 1000;
  } else if (period === '30d') {
    durationMs = 30 * 24 * 60 * 60 * 1000;
  }

  const startDate = new Date(now.getTime() - durationMs);

  // Fetch Checks within date range
  const checks = await prisma.apiCheck.findMany({
    where: {
      endpointId: endpoint.id,
      checkedAt: { gte: startDate },
    },
    orderBy: { checkedAt: 'asc' },
  });

  // Fetch Incidents overlapping with date range
  const incidents = await prisma.incident.findMany({
    where: {
      endpointId: endpoint.id,
      startedAt: { lte: now },
      OR: [
        { resolvedAt: null },
        { resolvedAt: { gt: startDate } },
      ],
    },
    orderBy: { startedAt: 'asc' },
  });

  // Incident Clamping Calculation
  let totalIncidentDurationMs = 0;
  const nowTime = now.getTime();
  const startTime = startDate.getTime();

  incidents.forEach((inc) => {
    const incStart = new Date(inc.startedAt).getTime();
    const incEnd = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : nowTime;

    const effectiveStart = Math.max(incStart, startTime);
    const effectiveEnd = Math.min(incEnd, nowTime);

    if (effectiveEnd > effectiveStart) {
      totalIncidentDurationMs += effectiveEnd - effectiveStart;
    }
  });

  const totalPeriodMs = durationMs;
  const uptimePercentage = Math.max(
    0,
    Math.min(
      100,
      Math.round(((totalPeriodMs - totalIncidentDurationMs) / totalPeriodMs) * 100 * 100) / 100
    )
  );

  const totalChecks = checks.length;
  const successfulChecks = checks.filter((c) => c.status === 'UP').length;
  const failedChecks = checks.filter((c) => c.status === 'DOWN').length;

  const validResponseTimes = checks
    .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
    .map((c) => c.responseTimeMs);

  const avgResponseTimeMs = validResponseTimes.length > 0
    ? Math.round(validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length)
    : null;

  const minResponseTimeMs = validResponseTimes.length > 0
    ? Math.min(...validResponseTimes)
    : null;

  const maxResponseTimeMs = validResponseTimes.length > 0
    ? Math.max(...validResponseTimes)
    : null;

  const medianResponseTimeMs = calculateMedian(validResponseTimes);
  const p95ResponseTimeMs = calculatePercentile(validResponseTimes, 0.95);

  const mttrData = calculateMttr(incidents);

  let latestStatus = 'UNKNOWN';
  let latestResponseTimeMs = null;
  let latestCheckedAt = null;

  if (checks.length > 0) {
    const latest = checks[checks.length - 1];
    latestStatus = latest.status;
    latestResponseTimeMs = latest.responseTimeMs;
    latestCheckedAt = latest.checkedAt;
  }

  // Chart aggregation (bucketed by hour for 24h, by 6h for 7d, by 24h for 30d)
  const bucketDurationMs = period === '24h'
    ? 60 * 60 * 1000
    : period === '7d'
    ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const chartSeries = [];
  let bucketStart = startTime;

  while (bucketStart < nowTime) {
    const bucketEnd = bucketStart + bucketDurationMs;
    const bucketChecks = checks.filter((c) => {
      const t = new Date(c.checkedAt).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    const bucketValidTimes = bucketChecks
      .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
      .map((c) => c.responseTimeMs);

    const bucketAvg = bucketValidTimes.length > 0
      ? Math.round(bucketValidTimes.reduce((a, b) => a + b, 0) / bucketValidTimes.length)
      : null;

    chartSeries.push({
      timestamp: new Date(bucketStart).toISOString(),
      label: new Date(bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avgResponseTimeMs: bucketAvg,
      checksCount: bucketChecks.length,
    });

    bucketStart = bucketEnd;
  }

  return {
    period,
    uptimePercentage,
    totalChecks,
    successfulChecks,
    failedChecks,
    avgResponseTimeMs,
    minResponseTimeMs,
    maxResponseTimeMs,
    medianResponseTimeMs,
    p95ResponseTimeMs,
    mttrMs: mttrData.mttrMs,
    mttrFormatted: mttrData.mttrFormatted,
    latestStatus,
    latestResponseTimeMs,
    latestCheckedAt,
    incidentsSummary: {
      count: incidents.length,
      resolvedCount: incidents.filter((i) => i.status === 'RESOLVED').length,
      totalDurationMs: totalIncidentDurationMs,
      totalDurationFormatted: formatDurationMs(totalIncidentDurationMs),
    },
    chartSeries,
  };
}

export async function getGlobalAnalytics(teamIdOrUserId) {
  if (!teamIdOrUserId) throw new Error('Contexte non identifié');

  const endpoints = await prisma.apiEndpoint.findMany({
    where: {
      OR: [
        { teamId: teamIdOrUserId },
        { userId: teamIdOrUserId },
      ],
    },
    select: { id: true, name: true, isActive: true, teamId: true },
  });

  const totalApis = endpoints.length;
  const activeEndpoints = endpoints.filter((e) => e.isActive);
  const activeApisCount = activeEndpoints.length;

  let upApisCount = 0;
  let downApisCount = 0;

  for (const ep of activeEndpoints) {
    const latestCheck = await prisma.apiCheck.findFirst({
      where: { endpointId: ep.id },
      orderBy: { checkedAt: 'desc' },
    });

    if (latestCheck) {
      if (latestCheck.status === 'UP') upApisCount++;
      else downApisCount++;
    }
  }

  // Calculate Weighted 24h Global Uptime & Avg Response Time
  const startDate24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeIds = activeEndpoints.map((e) => e.id);

  const checks24h = activeIds.length > 0
    ? await prisma.apiCheck.findMany({
        where: {
          endpointId: { in: activeIds },
          checkedAt: { gte: startDate24h },
        },
      })
    : [];

  const total24hChecks = checks24h.length;
  const up24hChecks = checks24h.filter((c) => c.status === 'UP').length;
  const globalUptime24h = total24hChecks > 0
    ? Math.round((up24hChecks / total24hChecks) * 100 * 100) / 100
    : null;

  const validTimes24h = checks24h
    .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
    .map((c) => c.responseTimeMs);

  const globalAvgResponseTime24h = validTimes24h.length > 0
    ? Math.round(validTimes24h.reduce((a, b) => a + b, 0) / validTimes24h.length)
    : null;

  const openIncidentsCount = await prisma.incident.count({
    where: {
      endpoint: {
        OR: [
          { teamId: teamIdOrUserId },
          { userId: teamIdOrUserId },
        ],
      },
      status: 'OPEN',
    },
  });

  return {
    totalApis,
    activeApisCount,
    upApisCount,
    downApisCount,
    globalUptime24h,
    globalAvgResponseTime24h,
    openIncidentsCount,
    hasData: total24hChecks > 0,
  };
}

/**
 * Retrieves chronological real activity events for a team (Checks, Incidents, Endpoints)
 */
export async function getTeamRecentActivity(teamId, { limit = 10 } = {}) {
  if (!teamId) throw new Error('Équipe non identifiée');

  const maxLimit = Math.max(1, Math.min(50, limit));

  // 1. Fetch recent incidents
  const recentIncidents = await prisma.incident.findMany({
    where: {
      endpoint: { teamId },
    },
    include: {
      endpoint: { select: { id: true, name: true, url: true, method: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: maxLimit,
  });

  // 2. Fetch recent checks
  const recentChecks = await prisma.apiCheck.findMany({
    where: {
      endpoint: { teamId },
    },
    include: {
      endpoint: { select: { id: true, name: true, url: true, method: true } },
    },
    orderBy: { checkedAt: 'desc' },
    take: maxLimit,
  });

  // 3. Fetch recently created/updated endpoints
  const recentEndpoints = await prisma.apiEndpoint.findMany({
    where: { teamId },
    select: { id: true, name: true, url: true, method: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
    take: maxLimit,
  });

  const events = [];

  // Format incidents
  recentIncidents.forEach((inc) => {
    events.push({
      id: `incident-start-${inc.id}`,
      type: 'INCIDENT_OPEN',
      category: 'incident',
      status: 'DOWN',
      title: inc.title || `Incident sur ${inc.endpoint?.name || 'Endpoint'}`,
      description: inc.cause || 'Échec de contrôle',
      timestamp: inc.startedAt,
      endpointId: inc.endpoint?.id,
      endpointName: inc.endpoint?.name,
    });

    if (inc.resolvedAt) {
      events.push({
        id: `incident-resolve-${inc.id}`,
        type: 'INCIDENT_RESOLVED',
        category: 'incident',
        status: 'UP',
        title: `Incident résolu : ${inc.endpoint?.name || 'Endpoint'}`,
        description: 'Le service a retrouvé son fonctionnement normal',
        timestamp: inc.resolvedAt,
        endpointId: inc.endpoint?.id,
        endpointName: inc.endpoint?.name,
      });
    }
  });

  // Format checks
  recentChecks.forEach((chk) => {
    events.push({
      id: `check-${chk.id}`,
      type: chk.status === 'UP' ? 'HEALTH_CHECK_UP' : 'HEALTH_CHECK_DOWN',
      category: 'check',
      status: chk.status,
      title: `Contrôle ${chk.status} : ${chk.endpoint?.name || 'Endpoint'}`,
      description: chk.status === 'UP'
        ? `${chk.responseTimeMs !== null ? `${chk.responseTimeMs} ms` : 'OK'} (HTTP ${chk.httpStatusCode || 200})`
        : chk.errorMessage || `Échec HTTP ${chk.httpStatusCode || 'N/A'}`,
      timestamp: chk.checkedAt,
      endpointId: chk.endpoint?.id,
      endpointName: chk.endpoint?.name,
    });
  });

  // Format endpoints
  recentEndpoints.forEach((ep) => {
    events.push({
      id: `endpoint-created-${ep.id}`,
      type: 'ENDPOINT_CREATED',
      category: 'endpoint',
      status: 'INFO',
      title: `Nouveau monitor : ${ep.name}`,
      description: `${ep.method} ${ep.url}`,
      timestamp: ep.createdAt,
      endpointId: ep.id,
      endpointName: ep.name,
    });
  });

  // Sort by timestamp desc and take the top `limit`
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events.slice(0, maxLimit);
}

/**
 * Calculates bucketed global response time series across all team endpoints
 */
export async function getGlobalResponseTimeSeries(teamId, period = '24h') {
  if (!teamId) throw new Error('Équipe non identifiée');

  const validPeriods = ['24h', '7d', '30d'];
  const safePeriod = validPeriods.includes(period) ? period : '24h';

  const now = new Date();
  let durationMs = 24 * 60 * 60 * 1000;
  if (safePeriod === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
  else if (safePeriod === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;

  const startDate = new Date(now.getTime() - durationMs);

  const checks = await prisma.apiCheck.findMany({
    where: {
      endpoint: { teamId },
      checkedAt: { gte: startDate },
    },
    orderBy: { checkedAt: 'asc' },
    select: {
      status: true,
      responseTimeMs: true,
      checkedAt: true,
    },
  });

  const bucketDurationMs = safePeriod === '24h'
    ? 60 * 60 * 1000
    : safePeriod === '7d'
    ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const chartSeries = [];
  let bucketStart = startDate.getTime();
  const nowTime = now.getTime();

  while (bucketStart < nowTime) {
    const bucketEnd = bucketStart + bucketDurationMs;
    const bucketChecks = checks.filter((c) => {
      const t = new Date(c.checkedAt).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    const upChecks = bucketChecks.filter((c) => c.status === 'UP');
    const downChecks = bucketChecks.filter((c) => c.status === 'DOWN');

    const validTimes = upChecks
      .filter((c) => typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
      .map((c) => c.responseTimeMs);

    const avgResponseTimeMs = validTimes.length > 0
      ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
      : null;

    const totalChecks = bucketChecks.length;
    const uptimePercentage = totalChecks > 0
      ? Math.round((upChecks.length / totalChecks) * 100 * 100) / 100
      : null;

    chartSeries.push({
      timestamp: new Date(bucketStart).toISOString(),
      label: new Date(bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avgResponseTimeMs,
      uptimePercentage,
      totalChecks,
      upChecks: upChecks.length,
      downChecks: downChecks.length,
      hasData: totalChecks > 0,
    });

    bucketStart = bucketEnd;
  }

  return {
    period: safePeriod,
    chartSeries,
    hasData: checks.length > 0,
  };
}

/**
 * Computes advanced comprehensive analytics for a team (or single endpoint)
 * Including P95, Median, Min, Max, Avg, MTTR, and HTTP status distribution.
 */
export async function getAdvancedTeamAnalytics(teamId, { endpointId, period = '24h' } = {}) {
  if (!teamId) throw new Error('Équipe non identifiée');

  const validPeriods = ['24h', '7d', '30d'];
  const safePeriod = validPeriods.includes(period) ? period : '24h';

  const now = new Date();
  let durationMs = 24 * 60 * 60 * 1000;
  if (safePeriod === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
  else if (safePeriod === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;

  const startDate = new Date(now.getTime() - durationMs);

  const whereClause = {
    endpoint: { teamId },
    checkedAt: { gte: startDate },
  };

  if (endpointId && endpointId.trim() && endpointId !== 'all') {
    whereClause.endpointId = endpointId.trim();
  }

  // 1. Fetch checks
  const checks = await prisma.apiCheck.findMany({
    where: whereClause,
    orderBy: { checkedAt: 'asc' },
    select: {
      id: true,
      endpointId: true,
      status: true,
      httpStatusCode: true,
      responseTimeMs: true,
      checkedAt: true,
    },
  });

  // 2. Fetch incidents for MTTR
  const incidentWhere = {
    endpoint: { teamId },
    startedAt: { gte: startDate },
  };
  if (endpointId && endpointId.trim() && endpointId !== 'all') {
    incidentWhere.endpointId = endpointId.trim();
  }

  const incidents = await prisma.incident.findMany({
    where: incidentWhere,
    select: {
      id: true,
      status: true,
      startedAt: true,
      resolvedAt: true,
    },
  });

  const totalChecks = checks.length;
  const upChecks = checks.filter((c) => c.status === 'UP');
  const downChecks = checks.filter((c) => c.status === 'DOWN');

  const uptimePercentage = totalChecks > 0
    ? Math.round((upChecks.length / totalChecks) * 100 * 100) / 100
    : null;

  // Valid response times (only UP and non-null)
  const validTimes = upChecks
    .filter((c) => typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
    .map((c) => c.responseTimeMs);

  const avgResponseTimeMs = validTimes.length > 0
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : null;

  const minResponseTimeMs = validTimes.length > 0
    ? Math.min(...validTimes)
    : null;

  const maxResponseTimeMs = validTimes.length > 0
    ? Math.max(...validTimes)
    : null;

  const medianResponseTimeMs = calculateMedian(validTimes);
  const p95ResponseTimeMs = calculatePercentile(validTimes, 0.95);

  const mttrData = calculateMttr(incidents);

  // HTTP Status Code Distribution
  const httpCodeCounts = {};
  const httpClassCounts = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    other: 0,
  };

  checks.forEach((c) => {
    const code = c.httpStatusCode;
    if (code !== null && code !== undefined) {
      const codeStr = String(code);
      httpCodeCounts[codeStr] = (httpCodeCounts[codeStr] || 0) + 1;

      if (code >= 200 && code < 300) httpClassCounts['2xx']++;
      else if (code >= 300 && code < 400) httpClassCounts['3xx']++;
      else if (code >= 400 && code < 500) httpClassCounts['4xx']++;
      else if (code >= 500 && code < 600) httpClassCounts['5xx']++;
      else httpClassCounts.other++;
    } else {
      httpClassCounts.other++;
    }
  });

  const httpDistributionList = Object.entries(httpCodeCounts).map(([code, count]) => ({
    code,
    count,
    percentage: totalChecks > 0 ? Math.round((count / totalChecks) * 100 * 10) / 10 : 0,
  })).sort((a, b) => b.count - a.count);

  // Bucket time series
  const bucketDurationMs = safePeriod === '24h'
    ? 60 * 60 * 1000
    : safePeriod === '7d'
    ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const chartSeries = [];
  let bucketStart = startDate.getTime();
  const nowTime = now.getTime();

  while (bucketStart < nowTime) {
    const bucketEnd = bucketStart + bucketDurationMs;
    const bucketChecks = checks.filter((c) => {
      const t = new Date(c.checkedAt).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    const bUp = bucketChecks.filter((c) => c.status === 'UP');
    const bTimes = bUp
      .filter((c) => typeof c.responseTimeMs === 'number' && Number.isFinite(c.responseTimeMs))
      .map((c) => c.responseTimeMs);

    const bAvg = bTimes.length > 0
      ? Math.round(bTimes.reduce((a, b) => a + b, 0) / bTimes.length)
      : null;
    const bMedian = calculateMedian(bTimes);
    const bP95 = calculatePercentile(bTimes, 0.95);

    const bTotal = bucketChecks.length;
    const bUptime = bTotal > 0
      ? Math.round((bUp.length / bTotal) * 100 * 100) / 100
      : null;

    chartSeries.push({
      timestamp: new Date(bucketStart).toISOString(),
      label: safePeriod === '24h'
        ? new Date(bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(bucketStart).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
      avgResponseTimeMs: bAvg,
      medianResponseTimeMs: bMedian,
      p95ResponseTimeMs: bP95,
      uptimePercentage: bUptime,
      totalChecks: bTotal,
      upChecks: bUp.length,
      downChecks: bTotal - bUp.length,
    });

    bucketStart = bucketEnd;
  }

  return {
    period: safePeriod,
    totalChecks,
    upChecks: upChecks.length,
    downChecks: downChecks.length,
    uptimePercentage,
    avgResponseTimeMs,
    minResponseTimeMs,
    maxResponseTimeMs,
    medianResponseTimeMs,
    p95ResponseTimeMs,
    mttrMs: mttrData.mttrMs,
    mttrFormatted: mttrData.mttrFormatted,
    resolvedIncidentsCount: mttrData.resolvedCount,
    httpDistribution: {
      byCode: httpDistributionList,
      byClass: httpClassCounts,
    },
    chartSeries,
    hasData: totalChecks > 0,
  };
}

function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0 min';
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes} min`;
}

import { prisma } from '../lib/prisma.js';
import { getApiEndpointById } from './api-service.js';

export async function getEndpointAnalytics(endpointId, userId, period = '24h') {
  if (!endpointId || !userId) {
    throw new Error('Paramètres manquants');
  }

  const validPeriods = ['24h', '7d', '30d'];
  if (!validPeriods.includes(period)) {
    throw new Error('Période invalide. Les périodes acceptées sont 24h, 7d, 30d');
  }

  // 1. Verify endpoint ownership
  const endpoint = await getApiEndpointById(userId, endpointId);

  const now = new Date();
  let durationMs = 24 * 60 * 60 * 1000;

  if (period === '7d') {
    durationMs = 7 * 24 * 60 * 60 * 1000;
  } else if (period === '30d') {
    durationMs = 30 * 24 * 60 * 60 * 1000;
  }

  const startDate = new Date(now.getTime() - durationMs);

  // 2. Fetch Checks within date range
  const checks = await prisma.apiCheck.findMany({
    where: {
      endpointId: endpoint.id,
      checkedAt: { gte: startDate },
    },
    orderBy: { checkedAt: 'asc' },
  });

  // 3. Fetch Incidents overlapping with date range
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

  // 4. Incident Clamping Calculation
  let totalIncidentDurationMs = 0;
  const nowTime = now.getTime();
  const startTime = startDate.getTime();

  incidents.forEach((inc) => {
    const incStart = new Date(inc.startedAt).getTime();
    const incEnd = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : nowTime;

    const effectiveStart = Math.max(incStart, startTime);
    const effectiveEnd = Math.min(incEnd, nowTime);

    if (effectiveEnd > effectiveStart) {
      totalIncidentDurationMs += (effectiveEnd - effectiveStart);
    }
  });

  // 5. Calculate Overall Endpoint Metrics
  const totalChecks = checks.length;
  const upChecks = checks.filter((c) => c.status === 'UP').length;
  const downChecks = totalChecks - upChecks;

  const hasData = totalChecks > 0;
  const uptimePercentage = hasData ? Math.round((upChecks / totalChecks) * 100 * 100) / 100 : null;

  const validTimes = checks
    .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number')
    .map((c) => c.responseTimeMs);

  const avgResponseTimeMs = validTimes.length > 0
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : null;

  const minResponseTimeMs = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const maxResponseTimeMs = validTimes.length > 0 ? Math.max(...validTimes) : null;

  let p95ResponseTimeMs = null;
  if (validTimes.length > 0) {
    const sorted = [...validTimes].sort((a, b) => a - b);
    const p95Idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
    p95ResponseTimeMs = sorted[p95Idx];
  }

  // 6. Build Time-Series Buckets for Charts
  let bucketCount = 24;
  let bucketMs = 60 * 60 * 1000; // 1 hour

  if (period === '7d') {
    bucketCount = 28;
    bucketMs = 6 * 60 * 60 * 1000; // 6 hours
  } else if (period === '30d') {
    bucketCount = 30;
    bucketMs = 24 * 60 * 60 * 1000; // 1 day
  }

  const chartSeries = [];
  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(startTime + i * bucketMs);
    const bEnd = new Date(startTime + (i + 1) * bucketMs);

    const bChecks = checks.filter(
      (c) => c.checkedAt >= bStart && c.checkedAt < bEnd
    );

    const bTotal = bChecks.length;
    let bAvgTime = null;
    let bUptime = null;
    let bUpCount = 0;
    let bDownCount = 0;

    if (bTotal > 0) {
      bUpCount = bChecks.filter((c) => c.status === 'UP').length;
      bDownCount = bTotal - bUpCount;
      bUptime = Math.round((bUpCount / bTotal) * 100 * 100) / 100;

      const bTimes = bChecks
        .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number')
        .map((c) => c.responseTimeMs);

      if (bTimes.length > 0) {
        bAvgTime = Math.round(bTimes.reduce((a, b) => a + b, 0) / bTimes.length);
      }
    }

    let label = '';
    if (period === '24h') {
      label = `${String(bStart.getHours()).padStart(2, '0')}:00`;
    } else if (period === '7d') {
      label = `${bStart.getDate()}/${bStart.getMonth() + 1} ${String(bStart.getHours()).padStart(2, '0')}h`;
    } else {
      label = `${bStart.getDate()}/${bStart.getMonth() + 1}`;
    }

    chartSeries.push({
      label,
      timestamp: bStart.toISOString(),
      avgResponseTimeMs: bAvgTime, // null if no data in bucket
      uptimePercentage: bUptime,  // null if no data in bucket
      totalChecks: bTotal,
      upChecks: bUpCount,
      downChecks: bDownCount,
      hasData: bTotal > 0,
    });
  }

  return {
    endpointId: endpoint.id,
    period,
    hasData,
    summary: {
      uptimePercentage,
      avgResponseTimeMs,
      minResponseTimeMs,
      maxResponseTimeMs,
      p95ResponseTimeMs,
      totalChecks,
      upChecks,
      downChecks,
    },
    incidentsSummary: {
      count: incidents.length,
      resolvedCount: incidents.filter((i) => i.status === 'RESOLVED').length,
      totalDurationMs: totalIncidentDurationMs,
      totalDurationFormatted: formatDurationMs(totalIncidentDurationMs),
    },
    chartSeries,
  };
}

export async function getGlobalAnalytics(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const endpoints = await prisma.apiEndpoint.findMany({
    where: { userId },
    select: { id: true, name: true, isActive: true },
  });

  const totalApis = endpoints.length;
  const activeEndpoints = endpoints.filter((e) => e.isActive);
  const activeApisCount = activeEndpoints.length;

  let upApisCount = 0;
  let downApisCount = 0;

  // Get status of active endpoints based on latest check
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
    .filter((c) => c.status === 'UP' && typeof c.responseTimeMs === 'number')
    .map((c) => c.responseTimeMs);

  const globalAvgResponseTime24h = validTimes24h.length > 0
    ? Math.round(validTimes24h.reduce((a, b) => a + b, 0) / validTimes24h.length)
    : null;

  const openIncidentsCount = await prisma.incident.count({
    where: { userId, status: 'OPEN' },
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

function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0 min';
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes} min`;
}

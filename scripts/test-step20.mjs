import { prisma } from '../lib/prisma.js';
import {
  calculatePercentile,
  calculateMedian,
  calculateMttr,
  getAdvancedTeamAnalytics,
  getEndpointAnalytics,
} from '../services/analytics-service.js';
import {
  getPaginatedApiChecks,
  getApiCheckDetail,
  exportApiChecksToCsv,
} from '../services/logs-service.js';
import { createTeam } from '../services/team-service.js';
import { createApiEndpoint } from '../services/api-service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runStep20Tests() {
  console.log('====================================================');
  console.log('   🚀 APIWatch — TEST SUITE ÉTAPE 20 (LOGS & ANALYTICS)');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: UNIT TESTS FOR PERCENTILE & MEDIAN ALGORITHMS
  // ----------------------------------------------------
  console.log('--- 1. Tests Percentile P95 (Nearest-Rank) & Médiane ---');

  // N = 0 (empty or null)
  assert(calculatePercentile([]) === null, 'P95([]) should return null');
  assert(calculatePercentile(null) === null, 'P95(null) should return null');
  assert(calculatePercentile([null, undefined, 'abc', NaN]) === null, 'P95 with no valid numbers should return null');

  // N = 1
  assert(calculatePercentile([150]) === 150, 'P95([150]) == 150 (N=1)');

  // N = 2: ceil(0.95 * 2) = 2 -> index 1 -> second item
  assert(calculatePercentile([100, 200]) === 200, 'P95([100, 200]) == 200 (N=2)');

  // N = 5: ceil(0.95 * 5) = 5 -> index 4 -> max item
  assert(calculatePercentile([10, 20, 30, 40, 50]) === 50, 'P95([10, 20, 30, 40, 50]) == 50 (N=5)');

  // N = 20: [1, 2, ..., 20], ceil(0.95 * 20) = 19 -> index 18 -> 19
  const twentyNumbers = Array.from({ length: 20 }, (_, i) => i + 1);
  assert(calculatePercentile(twentyNumbers) === 19, 'P95(1..20) == 19 (N=20)');

  // Filter nulls & unsorted
  assert(calculatePercentile([null, 300, 100, null, 200]) === 300, 'P95 ignores nulls and sorts automatically');

  // Median calculations
  assert(calculateMedian([]) === null, 'Median([]) == null');
  assert(calculateMedian([42]) === 42, 'Median([42]) == 42');
  assert(calculateMedian([10, 20, 30]) === 20, 'Median([10, 20, 30]) == 20 (odd)');
  assert(calculateMedian([10, 20, 30, 40]) === 25, 'Median([10, 20, 30, 40]) == 25 (even, round(20+30)/2)');
  assert(calculateMedian([null, 40, 10, 30, 20]) === 25, 'Median handles nulls and sorts');

  // ----------------------------------------------------
  // SECTION 2: UNIT TESTS FOR MTTR
  // ----------------------------------------------------
  console.log('\n--- 2. Tests Calcul MTTR ---');
  assert(calculateMttr([]).mttrMs === null, 'MTTR([]) == null');
  assert(calculateMttr(null).mttrMs === null, 'MTTR(null) == null');

  const openOnlyIncidents = [
    { id: '1', status: 'OPEN', startedAt: new Date(Date.now() - 60000), resolvedAt: null },
  ];
  assert(calculateMttr(openOnlyIncidents).mttrMs === null, 'MTTR excludes OPEN incidents');

  const mixedIncidents = [
    {
      id: '1',
      status: 'RESOLVED',
      startedAt: new Date('2026-09-01T10:00:00Z'),
      resolvedAt: new Date('2026-09-01T10:10:00Z'), // 10 min = 600,000 ms
    },
    {
      id: '2',
      status: 'RESOLVED',
      startedAt: new Date('2026-09-01T11:00:00Z'),
      resolvedAt: new Date('2026-09-01T11:20:00Z'), // 20 min = 1,200,000 ms
    },
    {
      id: '3',
      status: 'OPEN',
      startedAt: new Date('2026-09-01T12:00:00Z'),
      resolvedAt: null,
    },
  ];
  const mttrRes = calculateMttr(mixedIncidents);
  assert(mttrRes.mttrMs === 900000, `MTTR of 10m & 20m is 15m (900000ms), got ${mttrRes.mttrMs}`);
  assert(mttrRes.resolvedCount === 2, 'MTTR resolvedCount == 2');
  assert(mttrRes.mttrFormatted === '15 min', `MTTR formatted is "15 min", got ${mttrRes.mttrFormatted}`);

  // ----------------------------------------------------
  // SECTION 3: SEED TEST DATA FOR DB INTEGRATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Création des données de test pour Logs & Analytics ---');

  const testUser = await prisma.user.upsert({
    where: { email: 'step20-tester@apiwatch.local' },
    update: {},
    create: {
      email: 'step20-tester@apiwatch.local',
      passwordHash: 'hashedpassword',
      name: 'Step 20 Tester',
    },
  });

  const otherUser = await prisma.user.upsert({
    where: { email: 'step20-other@apiwatch.local' },
    update: {},
    create: {
      email: 'step20-other@apiwatch.local',
      passwordHash: 'hashedpassword',
      name: 'Step 20 Other User',
    },
  });

  const teamA = await prisma.team.create({
    data: {
      name: `Team Log Test A ${Date.now()}`,
      members: {
        create: {
          userId: testUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  const teamB = await prisma.team.create({
    data: {
      name: `Team Log Test B ${Date.now()}`,
      members: {
        create: {
          userId: otherUser.id,
          role: 'OWNER',
        },
      },
    },
  });

  // Create endpoints in Team A
  const endpointA1 = await prisma.apiEndpoint.create({
    data: {
      name: 'Auth Service API',
      url: 'https://auth.apiwatch.local/health',
      method: 'GET',
      teamId: teamA.id,
      userId: testUser.id,
    },
  });

  const endpointA2 = await prisma.apiEndpoint.create({
    data: {
      name: 'Payment Gateway',
      url: 'https://pay.apiwatch.local/status',
      method: 'POST',
      teamId: teamA.id,
      userId: testUser.id,
    },
  });

  // Create endpoint in Team B
  const endpointB1 = await prisma.apiEndpoint.create({
    data: {
      name: 'Secret Team B API',
      url: 'https://secret.team-b.local/ping',
      method: 'GET',
      teamId: teamB.id,
      userId: otherUser.id,
    },
  });

  console.log('  → Teams & Endpoints créés avec succès.');

  // Create 25 checks for endpointA1 with varied statuses, HTTP codes, and latencies
  const now = Date.now();
  const checksToCreate = [];

  for (let i = 0; i < 20; i++) {
    checksToCreate.push({
      endpointId: endpointA1.id,
      status: 'UP',
      httpStatusCode: 200,
      responseTimeMs: 50 + i * 10, // 50, 60, ..., 240
      errorMessage: null,
      checkedAt: new Date(now - (20 - i) * 60 * 1000), // within last 20 min
    });
  }

  // 3 4xx client errors
  checksToCreate.push({
    endpointId: endpointA1.id,
    status: 'DOWN',
    httpStatusCode: 404,
    responseTimeMs: 80,
    errorMessage: '404 Not Found: resource missing',
    checkedAt: new Date(now - 5 * 60 * 1000),
  });
  checksToCreate.push({
    endpointId: endpointA1.id,
    status: 'DOWN',
    httpStatusCode: 401,
    responseTimeMs: 45,
    errorMessage: '401 Unauthorized token expired',
    checkedAt: new Date(now - 4 * 60 * 1000),
  });

  // 2 5xx server errors
  checksToCreate.push({
    endpointId: endpointA2.id,
    status: 'DOWN',
    httpStatusCode: 500,
    responseTimeMs: 1200,
    errorMessage: '500 Internal Server Error in payment gateway',
    checkedAt: new Date(now - 3 * 60 * 1000),
  });
  checksToCreate.push({
    endpointId: endpointA2.id,
    status: 'DOWN',
    httpStatusCode: 503,
    responseTimeMs: null, // Timeout / no response time
    errorMessage: '503 Service Unavailable: database connection pool exhausted',
    checkedAt: new Date(now - 2 * 60 * 1000),
  });

  // Team B check
  const teamBCheck = await prisma.apiCheck.create({
    data: {
      endpointId: endpointB1.id,
      status: 'UP',
      httpStatusCode: 200,
      responseTimeMs: 99,
      errorMessage: null,
      checkedAt: new Date(),
    },
  });

  await prisma.apiCheck.createMany({
    data: checksToCreate,
  });

  console.log(`  → ${checksToCreate.length} checks créés pour Team A, 1 check pour Team B.`);

  // ----------------------------------------------------
  // SECTION 4: LOGS SERVICE PAGINATION & FILTERING TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. Tests getPaginatedApiChecks (Filtres, Pagination, Recherche) ---');

  // Test 1: Team A total count
  const allTeamALogs = await getPaginatedApiChecks(teamA.id, { limit: 50 });
  assert(allTeamALogs.pagination.totalCount === 24, `Team A has exactly 24 checks, got ${allTeamALogs.pagination.totalCount}`);
  assert(allTeamALogs.checks.length === 24, `Returned 24 checks on limit 50, got ${allTeamALogs.checks.length}`);

  // Test 2: Status filter (UP)
  const upLogs = await getPaginatedApiChecks(teamA.id, { status: 'UP' });
  assert(upLogs.pagination.totalCount === 20, `Status UP returns 20 checks, got ${upLogs.pagination.totalCount}`);
  assert(upLogs.checks.every((c) => c.status === 'UP'), 'All returned checks have status UP');

  // Test 3: Status filter (DOWN)
  const downLogs = await getPaginatedApiChecks(teamA.id, { status: 'DOWN' });
  assert(downLogs.pagination.totalCount === 4, `Status DOWN returns 4 checks, got ${downLogs.pagination.totalCount}`);
  assert(downLogs.checks.every((c) => c.status === 'DOWN'), 'All returned checks have status DOWN');

  // Test 4: HTTP exact code filter (404)
  const logs404 = await getPaginatedApiChecks(teamA.id, { httpCode: '404' });
  assert(logs404.pagination.totalCount === 1, `HTTP 404 returns 1 check, got ${logs404.pagination.totalCount}`);
  assert(logs404.checks[0].httpStatusCode === 404, 'Check has httpStatusCode 404');

  // Test 5: HTTP class filter (5xx)
  const logs5xx = await getPaginatedApiChecks(teamA.id, { httpCode: '5xx' });
  assert(logs5xx.pagination.totalCount === 2, `HTTP 5xx returns 2 checks, got ${logs5xx.pagination.totalCount}`);

  // Test 6: HTTP class filter (4xx)
  const logs4xx = await getPaginatedApiChecks(teamA.id, { httpCode: '4xx' });
  assert(logs4xx.pagination.totalCount === 2, `HTTP 4xx returns 2 checks, got ${logs4xx.pagination.totalCount}`);

  // Test 7: Text search (endpoint name "Payment")
  const searchName = await getPaginatedApiChecks(teamA.id, { search: 'payment' });
  assert(searchName.pagination.totalCount === 2, `Search 'payment' returns 2 checks, got ${searchName.pagination.totalCount}`);

  // Test 8: Text search (error message "exhausted")
  const searchError = await getPaginatedApiChecks(teamA.id, { search: 'exhausted' });
  assert(searchError.pagination.totalCount === 1, `Search 'exhausted' returns 1 check, got ${searchError.pagination.totalCount}`);

  // Test 9: Pagination (page 1, limit 10)
  const page1 = await getPaginatedApiChecks(teamA.id, { page: 1, limit: 10 });
  assert(page1.checks.length === 10, 'Page 1 has 10 items');
  assert(page1.pagination.page === 1, 'Pagination page == 1');
  assert(page1.pagination.totalPages === 3, 'Total pages for 24 items with limit 10 is 3');
  assert(page1.pagination.hasNextPage === true, 'Page 1 hasNextPage == true');
  assert(page1.pagination.hasPrevPage === false, 'Page 1 hasPrevPage == false');

  // Test 10: Pagination (page 3, limit 10)
  const page3 = await getPaginatedApiChecks(teamA.id, { page: 3, limit: 10 });
  assert(page3.checks.length === 4, 'Page 3 has remaining 4 items');
  assert(page3.pagination.hasNextPage === false, 'Page 3 hasNextPage == false');
  assert(page3.pagination.hasPrevPage === true, 'Page 3 hasPrevPage == true');

  // ----------------------------------------------------
  // SECTION 5: ZERO IDOR & SECURITY CHECKS
  // ----------------------------------------------------
  console.log('\n--- 5. Tests Sécurité & Anti-IDOR (Isolation stricte des équipes) ---');

  // Team A cannot access Team B check
  let teamACannotAccessB = false;
  try {
    await getApiCheckDetail(teamA.id, teamBCheck.id);
  } catch (err) {
    teamACannotAccessB = true;
  }
  assert(teamACannotAccessB, 'Team A getApiCheckDetail on Team B check throws access error (Anti-IDOR)');

  // Team B cannot see Team A checks in paginated logs
  const teamBLogs = await getPaginatedApiChecks(teamB.id, {});
  assert(teamBLogs.pagination.totalCount === 1, `Team B only sees its own 1 check, got ${teamBLogs.pagination.totalCount}`);
  assert(teamBLogs.checks[0].id === teamBCheck.id, 'Team B sees only teamBCheck');

  // Check detail retrieval for valid owner
  const validCheckDetail = await getApiCheckDetail(teamA.id, allTeamALogs.checks[0].id);
  assert(validCheckDetail.id === allTeamALogs.checks[0].id, 'getApiCheckDetail succeeds for own team check');
  assert(validCheckDetail.endpoint.name !== undefined, 'Check detail includes endpoint name');
  assert(validCheckDetail.endpoint.headersJson === undefined, 'Check detail never exposes headersJson secrets');

  // ----------------------------------------------------
  // SECTION 6: CSV EXPORT TESTS
  // ----------------------------------------------------
  console.log('\n--- 6. Tests Export CSV ---');

  // Default export
  const csvRes = await exportApiChecksToCsv(teamA.id, { limit: 1000 });
  assert(csvRes.count === 24, `CSV export contains 24 rows, got ${csvRes.count}`);
  assert(csvRes.csvContent.startsWith('id,endpoint_name,endpoint_method,endpoint_url,status,http_status_code,response_time_ms,error_message,checked_at'), 'CSV has correct header structure');
  assert(csvRes.filename.startsWith('apiwatch-logs-'), 'CSV filename is properly formatted');

  // Strict server limit enforcement (e.g. limit: -50 or 5000)
  const csvBoundedMin = await exportApiChecksToCsv(teamA.id, { limit: -10 });
  assert(csvBoundedMin.count === 1, 'Negative limit clamped to 1');

  const csvBoundedMax = await exportApiChecksToCsv(teamA.id, { limit: 9999 });
  assert(csvBoundedMax.count === 24, 'Excessive limit safely capped to server maximum (take: 1000)');

  // CSV filtered export
  const csvFiltered = await exportApiChecksToCsv(teamA.id, { status: 'DOWN' });
  assert(csvFiltered.count === 4, `Filtered CSV for DOWN has 4 rows, got ${csvFiltered.count}`);

  // ----------------------------------------------------
  // SECTION 7: ADVANCED ANALYTICS TESTS (P95, Median, HTTP Distribution)
  // ----------------------------------------------------
  console.log('\n--- 7. Tests getAdvancedTeamAnalytics ---');

  const advAnalytics = await getAdvancedTeamAnalytics(teamA.id, { period: '24h' });
  assert(advAnalytics.totalChecks === 24, `Advanced analytics totalChecks == 24, got ${advAnalytics.totalChecks}`);
  assert(advAnalytics.upChecks === 20, `upChecks == 20, got ${advAnalytics.upChecks}`);
  assert(advAnalytics.downChecks === 4, `downChecks == 4, got ${advAnalytics.downChecks}`);

  // 20 UP out of 24 = 83.33%
  assert(advAnalytics.uptimePercentage === 83.33, `Uptime is 83.33%, got ${advAnalytics.uptimePercentage}%`);

  // Valid response times for 20 UP checks: 50, 60, 70, ..., 240
  // Avg = (50 + 240) / 2 = 145 ms
  assert(advAnalytics.avgResponseTimeMs === 145, `avgResponseTimeMs == 145, got ${advAnalytics.avgResponseTimeMs}`);
  assert(advAnalytics.minResponseTimeMs === 50, `minResponseTimeMs == 50, got ${advAnalytics.minResponseTimeMs}`);
  assert(advAnalytics.maxResponseTimeMs === 240, `maxResponseTimeMs == 240, got ${advAnalytics.maxResponseTimeMs}`);

  // Median of 20 items: (140 + 150) / 2 = 145 ms
  assert(advAnalytics.medianResponseTimeMs === 145, `medianResponseTimeMs == 145, got ${advAnalytics.medianResponseTimeMs}`);

  // P95 of 20 items: rank = ceil(0.95*20) = 19 -> index 18 -> 230 ms
  assert(advAnalytics.p95ResponseTimeMs === 230, `p95ResponseTimeMs == 230, got ${advAnalytics.p95ResponseTimeMs}`);

  // HTTP status distribution check
  assert(advAnalytics.httpDistribution.byClass['2xx'] === 20, 'HTTP class 2xx == 20');
  assert(advAnalytics.httpDistribution.byClass['4xx'] === 2, 'HTTP class 4xx == 2');
  assert(advAnalytics.httpDistribution.byClass['5xx'] === 2, 'HTTP class 5xx == 2');
  assert(advAnalytics.httpDistribution.byCode.some((c) => c.code === '200' && c.count === 20), 'HTTP 200 code count == 20');

  // Chart series verification
  assert(Array.isArray(advAnalytics.chartSeries), 'chartSeries is an array');
  assert(advAnalytics.chartSeries.length > 0, 'chartSeries has bucketed points');

  // ----------------------------------------------------
  // SECTION 8: CLEANUP
  // ----------------------------------------------------
  console.log('\n--- 8. Nettoyage des données de test ---');
  await prisma.apiCheck.deleteMany({
    where: {
      endpointId: { in: [endpointA1.id, endpointA2.id, endpointB1.id] },
    },
  });
  await prisma.apiEndpoint.deleteMany({
    where: {
      id: { in: [endpointA1.id, endpointA2.id, endpointB1.id] },
    },
  });
  await prisma.teamMember.deleteMany({
    where: { teamId: { in: [teamA.id, teamB.id] } },
  });
  await prisma.team.deleteMany({
    where: { id: { in: [teamA.id, teamB.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [testUser.id, otherUser.id] } },
  });
  console.log('  → Données de test nettoyées.');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`   RÉSULTATS : ${passedTests} / ${totalTests} tests réussis (${failedTests} échecs)`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStep20Tests()
  .catch((err) => {
    console.error('Erreur fatale dans la suite de tests:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

/**
 * Test Suite: Étape 22 — Docker & Deployment
 *
 * Validates Dockerfile, docker-compose.yml, docker-entrypoint.sh, .dockerignore,
 * next.config.mjs standalone output, /api/health endpoint, environment variables,
 * and unified PostgreSQL configurations.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
  }
}

async function runStep22Tests() {
  console.log('\n==================================================');
  console.log('  TEST SUITE: ÉTAPE 22 — DOCKER & DEPLOYMENT');
  console.log('==================================================\n');

  // -------------------------------------------------------------
  // 1. DOCKERFILE VALIDATION
  // -------------------------------------------------------------
  console.log('--- 1. Dockerfile & Multi-stage Architecture ---');
  const dockerfilePath = join(ROOT_DIR, 'Dockerfile');
  assert(existsSync(dockerfilePath), 'Dockerfile exists at project root');

  if (existsSync(dockerfilePath)) {
    const dockerfile = readFileSync(dockerfilePath, 'utf8');
    assert(dockerfile.includes('FROM node:24-alpine AS deps'), 'Uses node:24-alpine in deps stage');
    assert(dockerfile.includes('FROM node:24-alpine AS builder'), 'Uses node:24-alpine in builder stage');
    assert(dockerfile.includes('FROM node:24-alpine AS runner'), 'Uses node:24-alpine in runner stage');
    assert(dockerfile.includes('adduser') && dockerfile.includes('nextjs'), 'Creates non-root user nextjs:nodejs (UID 1001)');
    assert(dockerfile.includes('USER nextjs'), 'Switches to non-root USER nextjs before running');
    assert(dockerfile.includes('.next/standalone'), 'Copies Next.js standalone bundle into runner');
    assert(dockerfile.includes('.next/static'), 'Copies Next.js static assets into runner');
    assert(dockerfile.includes('prisma'), 'Copies Prisma schema and migrations to runner');
    assert(dockerfile.includes('node_modules/prisma') || dockerfile.includes('node_modules/.bin'), 'Ensures Prisma CLI is available in runner');
    assert(dockerfile.includes('docker-entrypoint.sh'), 'Includes docker-entrypoint.sh');
    assert(dockerfile.includes('HEALTHCHECK'), 'Declares Docker HEALTHCHECK instruction with /api/health');
    assert(dockerfile.includes('EXPOSE 3000'), 'Exposes port 3000');
  }

  // -------------------------------------------------------------
  // 2. DOCKER-COMPOSE VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- 2. Docker Compose Configuration ---');
  const composePath = join(ROOT_DIR, 'docker-compose.yml');
  assert(existsSync(composePath), 'docker-compose.yml exists at project root');

  if (existsSync(composePath)) {
    const compose = readFileSync(composePath, 'utf8');
    assert(compose.includes('postgres:16-alpine'), 'Uses postgres:16-alpine image');
    assert(compose.includes('apiwatch_user'), 'Uses unified POSTGRES_USER=apiwatch_user');
    assert(compose.includes('apiwatch_db'), 'Uses unified POSTGRES_DB=apiwatch_db');
    assert(compose.includes('postgres_data:'), 'Declares persistent volume postgres_data');
    assert(compose.includes('apiwatch-network:'), 'Declares isolated network apiwatch-network');
    assert(compose.includes('condition: service_healthy'), 'Configures apiwatch depends_on postgres with service_healthy');
    assert(compose.includes('pg_isready'), 'PostgreSQL defines pg_isready healthcheck');
    assert(compose.includes('http://localhost:3000/api/health'), 'APIWatch defines /api/health container healthcheck');
    assert(compose.includes('APP_URL'), 'Uses APP_URL environment variable');
    assert(!compose.includes('NEXTAUTH_URL'), 'Does NOT contain NEXTAUTH_URL');
  }

  // -------------------------------------------------------------
  // 3. DOCKER ENTRYPOINT SCRIPT
  // -------------------------------------------------------------
  console.log('\n--- 3. Docker Entrypoint Script ---');
  const entrypointPath = join(ROOT_DIR, 'docker-entrypoint.sh');
  assert(existsSync(entrypointPath), 'docker-entrypoint.sh exists');

  if (existsSync(entrypointPath)) {
    const entrypoint = readFileSync(entrypointPath, 'utf8');
    assert(entrypoint.includes('prisma migrate deploy'), 'Entrypoint runs npx prisma migrate deploy on startup');
    assert(!entrypoint.includes('prisma migrate dev'), 'Entrypoint does NOT use prisma migrate dev');
    assert(entrypoint.includes('exec "$@"') || entrypoint.includes('node server.js'), 'Entrypoint passes execution to node server.js');
    assert(!entrypoint.includes('\r\n'), 'Entrypoint has strict Unix LF line endings (no CRLF)');
  }

  // -------------------------------------------------------------
  // 4. DOCKER IGNORE VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- 4. .dockerignore Configuration ---');
  const dockerignorePath = join(ROOT_DIR, '.dockerignore');
  assert(existsSync(dockerignorePath), '.dockerignore exists');

  if (existsSync(dockerignorePath)) {
    const dockerignore = readFileSync(dockerignorePath, 'utf8');
    assert(dockerignore.includes('.git'), 'Ignores .git directory');
    assert(dockerignore.includes('node_modules'), 'Ignores node_modules');
    assert(dockerignore.includes('.next'), 'Ignores .next build directory');
    assert(dockerignore.includes('.env'), 'Ignores local .env secret files');
  }

  // -------------------------------------------------------------
  // 5. NEXT CONFIG & STANDALONE OUTPUT
  // -------------------------------------------------------------
  console.log('\n--- 5. Next.js Standalone & Security Headers ---');
  const nextConfigPath = join(ROOT_DIR, 'next.config.mjs');
  const nextConfigContent = readFileSync(nextConfigPath, 'utf8');
  assert(nextConfigContent.includes("output: 'standalone'"), 'next.config.mjs enables output: standalone');
  assert(nextConfigContent.includes('Content-Security-Policy'), 'Preserves CSP security header');
  assert(nextConfigContent.includes('X-Frame-Options'), 'Preserves X-Frame-Options security header');
  assert(nextConfigContent.includes('X-Content-Type-Options'), 'Preserves X-Content-Type-Options security header');
  assert(nextConfigContent.includes('Referrer-Policy'), 'Preserves Referrer-Policy security header');
  assert(nextConfigContent.includes('Permissions-Policy'), 'Preserves Permissions-Policy security header');

  // -------------------------------------------------------------
  // 6. ENVIRONMENT CONFIGURATION (.env.example)
  // -------------------------------------------------------------
  console.log('\n--- 6. Environment Example Documentation ---');
  const envExamplePath = join(ROOT_DIR, '.env.example');
  assert(existsSync(envExamplePath), '.env.example exists');

  if (existsSync(envExamplePath)) {
    const envExample = readFileSync(envExamplePath, 'utf8');
    assert(envExample.includes('APP_URL='), 'Documents APP_URL');
    assert(!envExample.includes('NEXTAUTH_URL'), 'Does NOT contain NEXTAUTH_URL');
    assert(envExample.includes('POSTGRES_USER="apiwatch_user"'), 'Documents POSTGRES_USER=apiwatch_user');
    assert(envExample.includes('POSTGRES_DB="apiwatch_db"'), 'Documents POSTGRES_DB=apiwatch_db');
    assert(envExample.includes('JWT_SECRET='), 'Documents JWT_SECRET');
    assert(envExample.includes('CRON_SECRET='), 'Documents CRON_SECRET');
  }

  // -------------------------------------------------------------
  // 7. HEALTHCHECK ROUTE (/api/health)
  // -------------------------------------------------------------
  console.log('\n--- 7. Healthcheck Route (/api/health) ---');
  const healthRoutePath = join(ROOT_DIR, 'app', 'api', 'health', 'route.js');
  assert(existsSync(healthRoutePath), 'app/api/health/route.js exists');

  if (existsSync(healthRoutePath)) {
    const healthRouteCode = readFileSync(healthRoutePath, 'utf8');
    assert(healthRouteCode.includes('SELECT 1'), 'Executes database query SELECT 1');
    assert(healthRouteCode.includes('healthy'), 'Includes healthy status');
    assert(healthRouteCode.includes('unhealthy'), 'Includes unhealthy status on error');
    assert(healthRouteCode.includes('status: 503'), 'Returns 503 on database error');
    assert(!healthRouteCode.includes('DATABASE_URL'), 'Does not leak DATABASE_URL');
  }

  // Test DB Connectivity directly using prisma
  try {
    const dbCheck = await prisma.$queryRaw`SELECT 1 as result`;
    assert(Array.isArray(dbCheck) && dbCheck.length > 0, 'Direct database health query succeeds');
  } catch (err) {
    console.error('Database connection error in test:', err);
    assert(false, `Database check failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`  RESULTS: ${passedTests} / ${totalTests} assertions passed`);
  if (passedTests === totalTests) {
    console.log('  \x1b[32m✔ ALL ÉTAPE 22 TESTS PASSED!\x1b[0m');
    console.log('==================================================\n');
  } else {
    console.error(`  \x1b[31m✖ ${totalTests - passedTests} ASSERTION(S) FAILED!\x1b[0m`);
    console.log('==================================================\n');
    process.exit(1);
  }
}

runStep22Tests().catch((err) => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});

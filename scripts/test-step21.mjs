import { prisma } from '../lib/prisma.js';
import {
  normalizeIpv4,
  isPrivateOrReservedIp,
  validateSafeUrl,
  safeFetch,
} from '../lib/ssrf-guard.js';
import { rateLimiter } from '../lib/rate-limiter.js';
import { verifyCsrfOrigin } from '../lib/csrf-guard.js';
import { validateEnvironment } from '../lib/env-check.js';
import { signSessionToken, verifySessionToken } from '../lib/auth.js';
import { registerUser, loginUser } from '../services/auth-service.js';

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

async function runStep21Tests() {
  console.log('=============================================================');
  console.log('   🚀 APIWatch — TEST SUITE ÉTAPE 21 (SECURITY & HARDENING)');
  console.log('=============================================================\n');

  // ----------------------------------------------------
  // SECTION 1: SSRF GUARD & IP CLASSIFICATION
  // ----------------------------------------------------
  console.log('--- 1. Tests SSRF Guard & Normalisation IP ---');

  // IPv4 Normalization
  assert(normalizeIpv4('127.0.0.1') === '127.0.0.1', 'normalizeIpv4 standard dotted');
  assert(normalizeIpv4('2130706433') === '127.0.0.1', 'normalizeIpv4 decimal integer 2130706433 -> 127.0.0.1');
  assert(normalizeIpv4('0177.0.0.1') === '127.0.0.1', 'normalizeIpv4 octal 0177.0.0.1 -> 127.0.0.1');
  assert(normalizeIpv4('0x7f.0.0.1') === '127.0.0.1', 'normalizeIpv4 hex 0x7f.0.0.1 -> 127.0.0.1');
  assert(normalizeIpv4('invalid-ip') === null, 'normalizeIpv4 invalid returns null');

  // Private / Reserved IP checks
  assert(isPrivateOrReservedIp('127.0.0.1') === true, '127.0.0.1 is loopback');
  assert(isPrivateOrReservedIp('localhost') === true, 'localhost is loopback');
  assert(isPrivateOrReservedIp('0.0.0.0') === true, '0.0.0.0 is reserved');
  assert(isPrivateOrReservedIp('::1') === true, '::1 IPv6 loopback is reserved');
  assert(isPrivateOrReservedIp('[::1]') === true, '[::1] bracketed IPv6 loopback is reserved');
  assert(isPrivateOrReservedIp('10.0.0.1') === true, '10.0.0.1 RFC1918 is private');
  assert(isPrivateOrReservedIp('172.16.0.1') === true, '172.16.0.1 RFC1918 is private');
  assert(isPrivateOrReservedIp('172.31.255.255') === true, '172.31.255.255 RFC1918 is private');
  assert(isPrivateOrReservedIp('192.168.1.1') === true, '192.168.1.1 RFC1918 is private');
  assert(isPrivateOrReservedIp('169.254.169.254') === true, '169.254.169.254 Cloud Metadata is link-local');
  assert(isPrivateOrReservedIp('100.64.0.1') === true, '100.64.0.1 Carrier-Grade NAT is private');
  assert(isPrivateOrReservedIp('::ffff:127.0.0.1') === true, '::ffff:127.0.0.1 IPv4-mapped loopback is reserved');
  assert(isPrivateOrReservedIp('::ffff:10.0.0.1') === true, '::ffff:10.0.0.1 IPv4-mapped private is reserved');
  assert(isPrivateOrReservedIp('fc00::1') === true, 'fc00::1 IPv6 unique local is private');
  assert(isPrivateOrReservedIp('fe80::1') === true, 'fe80::1 IPv6 link-local is private');

  // Public IP checks
  assert(isPrivateOrReservedIp('8.8.8.8') === false, '8.8.8.8 Google DNS is public');
  assert(isPrivateOrReservedIp('1.1.1.1') === false, '1.1.1.1 Cloudflare DNS is public');
  assert(isPrivateOrReservedIp('93.184.216.34') === false, '93.184.216.34 example.com is public');

  // ----------------------------------------------------
  // SECTION 2: URL VALIDATION & SAFE FETCH
  // ----------------------------------------------------
  console.log('\n--- 2. Tests URL Validation & safeFetch ---');

  const localhostValidation = await validateSafeUrl('http://localhost:3000/api/health');
  assert(localhostValidation.valid === false, 'validateSafeUrl rejects http://localhost:3000');

  const ipLocalValidation = await validateSafeUrl('http://127.0.0.1:3000');
  assert(ipLocalValidation.valid === false, 'validateSafeUrl rejects http://127.0.0.1:3000');

  const metadataValidation = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
  assert(metadataValidation.valid === false, 'validateSafeUrl rejects AWS metadata endpoint');

  const rfc1918Validation = await validateSafeUrl('http://192.168.1.1/admin');
  assert(rfc1918Validation.valid === false, 'validateSafeUrl rejects 192.168.1.1');

  const decimalValidation = await validateSafeUrl('http://2130706433:80');
  assert(decimalValidation.valid === false, 'validateSafeUrl rejects decimal IPv4 2130706433');

  const nonHttpValidation = await validateSafeUrl('ftp://api.github.com/files');
  assert(nonHttpValidation.valid === false, 'validateSafeUrl rejects non-http/https protocol ftp://');

  const malformedValidation = await validateSafeUrl('not a valid url');
  assert(malformedValidation.valid === false, 'validateSafeUrl rejects malformed URL');

  // safeFetch execution rejection
  let safeFetchBlockedLocal = false;
  try {
    await safeFetch('http://127.0.0.1:3000/api/test');
  } catch (err) {
    safeFetchBlockedLocal = true;
  }
  assert(safeFetchBlockedLocal === true, 'safeFetch throws Error when target is 127.0.0.1:3000');

  // ----------------------------------------------------
  // SECTION 3: IN-MEMORY RATE LIMITER TESTS
  // ----------------------------------------------------
  console.log('\n--- 3. Tests In-Memory Rate Limiter ---');

  const testKey = `test:rl:${Date.now()}`;
  const r1 = rateLimiter.check(testKey, { maxRequests: 2, windowMs: 1000 });
  assert(r1.allowed === true, 'Request 1/2 is allowed');
  assert(r1.remaining === 1, 'Remaining is 1');

  const r2 = rateLimiter.check(testKey, { maxRequests: 2, windowMs: 1000 });
  assert(r2.allowed === true, 'Request 2/2 is allowed');
  assert(r2.remaining === 0, 'Remaining is 0');

  const r3 = rateLimiter.check(testKey, { maxRequests: 2, windowMs: 1000 });
  assert(r3.allowed === false, 'Request 3/2 is blocked (429)');
  assert(r3.retryAfterSeconds >= 1, 'retryAfterSeconds >= 1');

  rateLimiter.reset(testKey);
  const r4 = rateLimiter.check(testKey, { maxRequests: 2, windowMs: 1000 });
  assert(r4.allowed === true, 'After reset, request is allowed again');

  // ----------------------------------------------------
  // SECTION 4: CSRF & ORIGIN VERIFICATION TESTS
  // ----------------------------------------------------
  console.log('\n--- 4. Tests CSRF & Vérification Origin/Referer ---');

  // Safe GET method
  const getReq = { method: 'GET', headers: new Headers() };
  assert(verifyCsrfOrigin(getReq).valid === true, 'GET request bypasses CSRF check');

  // POST with valid Origin
  const validPostHeaders = new Headers({
    host: 'apiwatch.local:3000',
    origin: 'http://apiwatch.local:3000',
  });
  const validPostReq = { method: 'POST', headers: validPostHeaders };
  assert(verifyCsrfOrigin(validPostReq).valid === true, 'POST with matching Origin is allowed');

  // POST with foreign Origin (Attack)
  const attackerPostHeaders = new Headers({
    host: 'apiwatch.local:3000',
    origin: 'http://malicious-attacker.com',
  });
  const attackerPostReq = { method: 'POST', headers: attackerPostHeaders };
  const attackerResult = verifyCsrfOrigin(attackerPostReq);
  assert(attackerResult.valid === false, 'POST with malicious Origin is rejected');

  // POST with valid Referer
  const validRefererHeaders = new Headers({
    host: 'apiwatch.local:3000',
    referer: 'http://apiwatch.local:3000/dashboard/team',
  });
  const validRefererReq = { method: 'POST', headers: validRefererHeaders };
  assert(verifyCsrfOrigin(validRefererReq).valid === true, 'POST with matching Referer is allowed');

  // POST with foreign Referer (Attack)
  const attackerRefererHeaders = new Headers({
    host: 'apiwatch.local:3000',
    referer: 'http://malicious-site.com/exploit',
  });
  const attackerRefererReq = { method: 'POST', headers: attackerRefererHeaders };
  assert(verifyCsrfOrigin(attackerRefererReq).valid === false, 'POST with malicious Referer is rejected');

  // ----------------------------------------------------
  // SECTION 5: AUTHENTICATION & PASSWORD HARDENING
  // ----------------------------------------------------
  console.log('\n--- 5. Tests Authentification & Hardening Mots de Passe ---');

  // Register with short password (< 8 chars)
  let shortPasswordError = false;
  try {
    await registerUser({
      name: 'Short Tester',
      email: 'short-pwd@apiwatch.local',
      password: '123',
      confirmPassword: '123',
    });
  } catch (err) {
    shortPasswordError = err.message.includes('8 caractères');
  }
  assert(shortPasswordError === true, 'Registration with password < 8 chars is rejected');

  // Register with huge password (> 128 chars DoS)
  let hugePasswordError = false;
  try {
    const huge = 'A'.repeat(200);
    await registerUser({
      name: 'Huge Tester',
      email: 'huge-pwd@apiwatch.local',
      password: huge,
      confirmPassword: huge,
    });
  } catch (err) {
    hugePasswordError = err.message.includes('128 caractères');
  }
  assert(hugePasswordError === true, 'Registration with password > 128 chars is rejected');

  // Valid registration (>= 8 chars)
  const validUser = await registerUser({
    name: 'Step 21 Hardened User',
    email: `step21-user-${Date.now()}@apiwatch.local`,
    password: 'SuperSecretPassword123!',
    confirmPassword: 'SuperSecretPassword123!',
  });
  assert(validUser.id !== undefined, 'User registered successfully with valid password');
  assert(validUser.passwordHash === undefined, 'passwordHash is NEVER returned in register result');

  // Timing-safe login with non-existent email
  let nonExistentUserError = false;
  try {
    await loginUser({
      email: 'does-not-exist-999@apiwatch.local',
      password: 'SomePassword123!',
    });
  } catch (err) {
    nonExistentUserError = err.message === 'Identifiants incorrects';
  }
  assert(nonExistentUserError === true, 'Non-existent user returns generic "Identifiants incorrects"');

  // Login with existing user but wrong password
  let wrongPasswordError = false;
  try {
    await loginUser({
      email: validUser.email,
      password: 'WrongPassword999!',
    });
  } catch (err) {
    wrongPasswordError = err.message === 'Identifiants incorrects';
  }
  assert(wrongPasswordError === true, 'Wrong password returns generic "Identifiants incorrects"');

  // Login with correct credentials
  const loggedIn = await loginUser({
    email: validUser.email,
    password: 'SuperSecretPassword123!',
  });
  assert(loggedIn.id === validUser.id, 'Login succeeds with correct credentials');
  assert(loggedIn.passwordHash === undefined, 'passwordHash is NEVER returned in login result');

  // ----------------------------------------------------
  // SECTION 6: JWT & SESSION TOKENS
  // ----------------------------------------------------
  console.log('\n--- 6. Tests JWT & Sessions ---');

  const payload = { userId: validUser.id, email: validUser.email, name: validUser.name };
  const token = await signSessionToken(payload);
  assert(typeof token === 'string' && token.length > 20, 'Session token signed successfully');

  const verified = await verifySessionToken(token);
  assert(verified.userId === validUser.id, 'Session token verified with correct userId');
  assert(verified.email === validUser.email, 'Session token contains correct email');

  const invalidToken = await verifySessionToken('forged.invalid.token');
  assert(invalidToken === null, 'Forged token verification returns null');

  // ----------------------------------------------------
  // SECTION 7: ENVIRONMENT VALIDATION
  // ----------------------------------------------------
  console.log('\n--- 7. Tests Validation Environnement au Démarrage ---');

  const envCheck = validateEnvironment();
  assert(envCheck.valid === true, 'validateEnvironment passes in development');

  // ----------------------------------------------------
  // SECTION 8: CLEANUP
  // ----------------------------------------------------
  console.log('\n--- 8. Nettoyage des données de test ---');
  await prisma.teamMember.deleteMany({
    where: { userId: validUser.id },
  });
  await prisma.team.deleteMany({
    where: { id: validUser.activeTeamId },
  });
  await prisma.user.deleteMany({
    where: { id: validUser.id },
  });
  console.log('  → Données de test nettoyées.');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n=============================================================');
  console.log(`   RÉSULTATS : ${passedTests} / ${totalTests} tests réussis (${failedTests} échecs)`);
  console.log('=============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStep21Tests()
  .catch((err) => {
    console.error('Erreur fatale dans la suite de tests:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  getUserDashboardPreferences,
  updateUserDashboardPreferences,
  resetUserDashboardPreferences,
  normalizeDashboardConfig,
  dashboardConfigSchema,
  WIDGET_IDS,
  DEFAULT_DASHBOARD_CONFIG,
} from '../services/dashboard-service.js';
import { createTeam } from '../services/team-service.js';
import { createApiEndpoint } from '../services/api-service.js';
import {
  getGlobalAnalytics,
  getTeamRecentActivity,
  getGlobalResponseTimeSeries,
} from '../services/analytics-service.js';
import { getActiveTeamContext, enforceRole } from '../lib/team-context.js';

const prisma = new PrismaClient();
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    results.push({ testName, pass: true });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ testName, pass: false, details });
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    throw new Error(`Test failed: ${testName} (${details})`);
  }
}

async function main() {
  console.log('=============================================================');
  console.log('🧪 SUITE DE TESTS — ÉTAPE 19 : CUSTOMIZABLE DASHBOARD');
  console.log('=============================================================\n');

  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Setup Test Users
  const userA = await prisma.user.create({
    data: {
      name: `User A Step19 ${timestamp}`,
      email: `user_a_s19_${timestamp}@apiwatch.test`,
      passwordHash,
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: `User B Step19 ${timestamp}`,
      email: `user_b_s19_${timestamp}@apiwatch.test`,
      passwordHash,
    },
  });

  const userViewer = await prisma.user.create({
    data: {
      name: `Viewer Step19 ${timestamp}`,
      email: `viewer_s19_${timestamp}@apiwatch.test`,
      passwordHash,
    },
  });

  // 2. Setup Teams
  const team1 = await createTeam(`Team 1 S19 ${timestamp}`, userA.id);
  const team2 = await createTeam(`Team 2 S19 ${timestamp}`, userA.id);

  // Add User B as MEMBER to Team 1
  await prisma.teamMember.create({
    data: {
      teamId: team1.id,
      userId: userB.id,
      role: 'MEMBER',
    },
  });

  // Add User Viewer as VIEWER to Team 1
  await prisma.teamMember.create({
    data: {
      teamId: team1.id,
      userId: userViewer.id,
      role: 'VIEWER',
    },
  });

  // 3. Create Sample Endpoint and Checks for Team 1
  const endpoint1 = await createApiEndpoint(
    { userId: userA.id, teamId: team1.id },
    {
      name: `API Gateway ${timestamp}`,
      url: 'https://api.example.com/health',
      method: 'GET',
    }
  );

  await prisma.apiCheck.create({
    data: {
      endpointId: endpoint1.id,
      status: 'UP',
      httpStatusCode: 200,
      responseTimeMs: 120,
      checkedAt: new Date(Date.now() - 60000),
    },
  });

  await prisma.apiCheck.create({
    data: {
      endpointId: endpoint1.id,
      status: 'DOWN',
      httpStatusCode: 500,
      responseTimeMs: null,
      errorMessage: 'Internal Server Error',
      checkedAt: new Date(),
    },
  });

  await prisma.incident.create({
    data: {
      endpointId: endpoint1.id,
      userId: userA.id,
      status: 'OPEN',
      title: `Panne sur ${endpoint1.name}`,
      cause: 'HTTP 500 Internal Server Error',
      startedAt: new Date(),
    },
  });

  console.log('▶ Groupe 1 : Configuration par Défaut & Récupération');

  // Test 1: Whitelist contains all 7 required widgets
  assert(
    WIDGET_IDS.length === 7 &&
      WIDGET_IDS.includes('overview') &&
      WIDGET_IDS.includes('api-status') &&
      WIDGET_IDS.includes('uptime') &&
      WIDGET_IDS.includes('response-time') &&
      WIDGET_IDS.includes('incidents') &&
      WIDGET_IDS.includes('activity') &&
      WIDGET_IDS.includes('health-summary'),
    'Whitelist des 7 widgets officiels exacte'
  );

  // Test 2: Default configuration contains all 7 widgets with visible=true
  assert(
    DEFAULT_DASHBOARD_CONFIG.widgets.length === 7 &&
      DEFAULT_DASHBOARD_CONFIG.widgets.every((w) => w.visible === true),
    'Configuration par défaut complète avec 7 widgets visibles'
  );

  // Test 3: Get preferences when no custom config stored
  const defaultPrefA = await getUserDashboardPreferences(userA.id, team1.id);
  assert(
    defaultPrefA.isCustom === false &&
      defaultPrefA.config.widgets.length === 7 &&
      defaultPrefA.config.widgets[0].id === 'overview',
    'Retourne la configuration par défaut avec isCustom=false si non personnalisée'
  );

  // Test 4: Sequential order normalization in default config
  assert(
    defaultPrefA.config.widgets.every((w, idx) => w.order === idx),
    'Ordre séquentiel normalisé (0, 1, 2, ...)'
  );

  console.log('\n▶ Groupe 2 : Sauvegarde, Mise à jour & Personnalisation (PUT)');

  // Test 5: Customizing order, size and visibility for User A on Team 1
  const customConfig = {
    widgets: [
      { id: 'response-time', visible: true, size: 'large', order: 0 },
      { id: 'api-status', visible: true, size: 'large', order: 1 },
      { id: 'incidents', visible: true, size: 'small', order: 2 },
      { id: 'overview', visible: false, size: 'medium', order: 3 },
      { id: 'uptime', visible: false, size: 'small', order: 4 },
      { id: 'activity', visible: true, size: 'medium', order: 5 },
      { id: 'health-summary', visible: true, size: 'small', order: 6 },
    ],
  };

  const updatedA = await updateUserDashboardPreferences(userA.id, team1.id, customConfig);
  assert(
    updatedA.isCustom === true &&
      updatedA.config.widgets.length === 7 &&
      updatedA.config.widgets[0].id === 'response-time',
    'Mise à jour réussie avec isCustom=true et réordonnancement'
  );

  // Test 6: Verify persistence in PostgreSQL
  const savedRecordInDb = await prisma.dashboardPreference.findUnique({
    where: { userId_teamId: { userId: userA.id, teamId: team1.id } },
  });
  assert(
    savedRecordInDb !== null &&
      savedRecordInDb.config.widgets[0].id === 'response-time' &&
      savedRecordInDb.config.widgets[3].visible === false,
    'Persistance effective en base PostgreSQL dans dashboard_preferences'
  );

  // Test 7: Retrieve updated preferences via service
  const fetchedUpdatedA = await getUserDashboardPreferences(userA.id, team1.id);
  assert(
    fetchedUpdatedA.isCustom === true &&
      fetchedUpdatedA.config.widgets[3].id === 'overview' &&
      fetchedUpdatedA.config.widgets[3].visible === false,
    'Lecture des préférences personnalisées depuis la base de données'
  );

  console.log('\n▶ Groupe 3 : Validation Stricte des Schémas Zod');

  // Test 8: Reject unknown widget ID
  const invalidWidgetIdConfig = {
    widgets: [{ id: 'arbitrary-hacker-widget', visible: true, size: 'small', order: 0 }],
  };
  const val1 = dashboardConfigSchema.safeParse(invalidWidgetIdConfig);
  assert(val1.success === false, 'Rejet d’un identifiant de widget inconnu (Zod enum)');

  // Test 9: Reject invalid size
  const invalidSizeConfig = {
    widgets: [{ id: 'overview', visible: true, size: 'gigantic-size', order: 0 }],
  };
  const val2 = dashboardConfigSchema.safeParse(invalidSizeConfig);
  assert(val2.success === false, 'Rejet d’une taille invalide (Zod size enum)');

  // Test 10: Reject negative order
  const invalidOrderConfig = {
    widgets: [{ id: 'overview', visible: true, size: 'large', order: -1 }],
  };
  const val3 = dashboardConfigSchema.safeParse(invalidOrderConfig);
  assert(val3.success === false, 'Rejet d’un ordre négatif (min: 0)');

  // Test 11: Reject non-boolean visibility
  const invalidVisConfig = {
    widgets: [{ id: 'overview', visible: 'yes', size: 'large', order: 0 }],
  };
  const val4 = dashboardConfigSchema.safeParse(invalidVisConfig);
  assert(val4.success === false, 'Rejet d’une visibilité non-booléenne');

  // Test 12: Reject duplicate widget IDs
  const duplicateIdConfig = {
    widgets: [
      { id: 'overview', visible: true, size: 'large', order: 0 },
      { id: 'overview', visible: true, size: 'small', order: 1 },
    ],
  };
  const val5 = dashboardConfigSchema.safeParse(duplicateIdConfig);
  assert(val5.success === false, 'Rejet des doublons d’identifiants de widget');

  // Test 13: Reject empty widgets array
  const emptyWidgetsConfig = { widgets: [] };
  const val6 = dashboardConfigSchema.safeParse(emptyWidgetsConfig);
  assert(val6.success === false, 'Rejet d’un tableau de widgets vide (min: 1)');

  // Test 14: Normalize automatically restores any missing default widgets
  const partialConfig = {
    widgets: [{ id: 'overview', visible: true, size: 'small', order: 0 }],
  };
  const normalizedPartial = normalizeDashboardConfig(partialConfig);
  assert(
    normalizedPartial.widgets.length === 7 &&
      normalizedPartial.widgets.some((w) => w.id === 'incidents'),
    'Normalisation automatique réintégrant les widgets manquants'
  );

  console.log('\n▶ Groupe 4 : Isolation Multi-Utilisateurs (Même Équipe)');

  // Test 15: User B on Team 1 is untouched by User A's custom dashboard
  const userBPrefTeam1 = await getUserDashboardPreferences(userB.id, team1.id);
  assert(
    userBPrefTeam1.isCustom === false &&
      userBPrefTeam1.config.widgets[0].id === 'overview' &&
      userBPrefTeam1.config.widgets[0].visible === true,
    'User B conserve sa configuration par défaut malgré la personnalisation de User A'
  );

  // Test 16: User B customizes their own distinct dashboard on Team 1
  const customConfigB = {
    widgets: [
      { id: 'incidents', visible: true, size: 'large', order: 0 },
      { id: 'overview', visible: true, size: 'small', order: 1 },
      { id: 'api-status', visible: false, size: 'small', order: 2 },
    ],
  };
  await updateUserDashboardPreferences(userB.id, team1.id, customConfigB);

  // Test 17: Verify User A and User B have separate configurations in DB
  const userAAfter = await getUserDashboardPreferences(userA.id, team1.id);
  const userBAfter = await getUserDashboardPreferences(userB.id, team1.id);

  assert(
    userAAfter.config.widgets[0].id === 'response-time' &&
      userBAfter.config.widgets[0].id === 'incidents',
    'Isolation stricte : User A (response-time en premier) != User B (incidents en premier)'
  );

  // Test 18: Verify DB unique constraint @@unique([userId, teamId])
  const prefCountTeam1 = await prisma.dashboardPreference.count({
    where: { teamId: team1.id },
  });
  assert(
    prefCountTeam1 === 2,
    'Exactement 2 préférences enregistrées pour 2 utilisateurs dans Team 1'
  );

  console.log('\n▶ Groupe 5 : Isolation Multi-Équipes (Même Utilisateur)');

  // Test 19: User A on Team 2 still has default config
  const userAPrefTeam2 = await getUserDashboardPreferences(userA.id, team2.id);
  assert(
    userAPrefTeam2.isCustom === false &&
      userAPrefTeam2.config.widgets[0].id === 'overview',
    'User A sur Team 2 dispose d’une configuration indépendante de Team 1'
  );

  // Test 20: User A customizes Team 2
  const customConfigTeam2 = {
    widgets: [{ id: 'health-summary', visible: true, size: 'large', order: 0 }],
  };
  await updateUserDashboardPreferences(userA.id, team2.id, customConfigTeam2);

  const userA_T1 = await getUserDashboardPreferences(userA.id, team1.id);
  const userA_T2 = await getUserDashboardPreferences(userA.id, team2.id);

  assert(
    userA_T1.config.widgets[0].id === 'response-time' &&
      userA_T2.config.widgets[0].id === 'health-summary',
    'User A possède des dispositions distinctes par équipe (Team 1 vs Team 2)'
  );

  console.log('\n▶ Groupe 6 : Réinitialisation aux Valeurs par Défaut (POST reset)');

  // Test 21: Reset User A preferences on Team 1
  const resetRes = await resetUserDashboardPreferences(userA.id, team1.id);
  assert(
    resetRes.isCustom === false &&
      resetRes.config.widgets[0].id === 'overview' &&
      resetRes.config.widgets.every((w) => w.visible === true),
    'Réinitialisation retourne la configuration par défaut avec isCustom=false'
  );

  // Test 22: Record is removed from DB
  const checkDeleted = await prisma.dashboardPreference.findUnique({
    where: { userId_teamId: { userId: userA.id, teamId: team1.id } },
  });
  assert(
    checkDeleted === null,
    'Enregistrement supprimé de la base de données après réinitialisation'
  );

  // Test 23: Team 2 configuration remains custom and untouched
  const checkTeam2Intact = await getUserDashboardPreferences(userA.id, team2.id);
  assert(
    checkTeam2Intact.isCustom === true &&
      checkTeam2Intact.config.widgets[0].id === 'health-summary',
    'La réinitialisation sur Team 1 n’impacte pas la configuration de Team 2'
  );

  console.log('\n▶ Groupe 7 : RBAC & Autorisations');

  // Test 24: VIEWER can get and update their own preferences
  const viewerPref = await getUserDashboardPreferences(userViewer.id, team1.id);
  assert(
    viewerPref.isCustom === false,
    'Rôle VIEWER autorisé à lire ses préférences de tableau de bord'
  );

  const updatedViewer = await updateUserDashboardPreferences(userViewer.id, team1.id, {
    widgets: [{ id: 'uptime', visible: true, size: 'medium', order: 0 }],
  });
  assert(
    updatedViewer.isCustom === true && updatedViewer.config.widgets[0].id === 'uptime',
    'Rôle VIEWER autorisé à enregistrer ses propres préférences'
  );

  console.log('\n▶ Groupe 8 : Données Réelles des 7 Widgets');

  // Test 25: Widget 1 (Overview) & Global Analytics
  const globalAnalytics = await getGlobalAnalytics(team1.id);
  assert(
    globalAnalytics.totalApis === 1 &&
      globalAnalytics.downApisCount === 1 &&
      globalAnalytics.openIncidentsCount === 1,
    'Widget Overview : Métriques globales synchronisées avec la DB réelle'
  );

  // Test 26: Widget 2 (API Status)
  const teamEndpoints = await prisma.apiEndpoint.findMany({
    where: { teamId: team1.id },
  });
  assert(
    teamEndpoints.length === 1 && teamEndpoints[0].name.includes('API Gateway'),
    'Widget API Status : Liste des endpoints réels de l’équipe'
  );

  // Test 27: Widget 3 (Uptime 24h)
  assert(
    globalAnalytics.globalUptime24h !== undefined,
    'Widget Uptime : Calcul du taux de disponibilité sur 24h'
  );

  // Test 28: Widget 4 (Response Time Series)
  const seriesData = await getGlobalResponseTimeSeries(team1.id, '24h');
  assert(
    seriesData.period === '24h' &&
      Array.isArray(seriesData.chartSeries) &&
      seriesData.hasData === true,
    'Widget Response Time : Série temporelle agrégée par heure pour Recharts'
  );

  // Test 29: Widget 5 (Incidents)
  const openIncidents = await prisma.incident.findMany({
    where: { endpoint: { teamId: team1.id }, status: 'OPEN' },
  });
  assert(
    openIncidents.length === 1 && openIncidents[0].title.includes('Panne'),
    'Widget Incidents : Incidents ouverts réels filtrés par équipe'
  );

  // Test 30: Widget 6 (Activity) — Uses real ApiCheck, Incident, Endpoint
  const activities = await getTeamRecentActivity(team1.id, { limit: 10 });
  assert(
    activities.length >= 3 &&
      activities.some((a) => a.type === 'INCIDENT_OPEN') &&
      activities.some((a) => a.type === 'HEALTH_CHECK_UP') &&
      activities.some((a) => a.type === 'ENDPOINT_CREATED'),
    'Widget Activity : Agrégation des événements réels (Checks, Incidents, Endpoints)'
  );

  // Test 31: Widget 7 (Health Summary)
  assert(
    globalAnalytics.upApisCount === 0 && globalAnalytics.downApisCount === 1,
    'Widget Health Summary : Répartition binaire réelle UP / DOWN'
  );

  console.log('\n▶ Groupe 9 : Non-Régression & Sécurité Anti-IDOR');

  // Test 32: Security parameters missing rejection
  let caughtMissingParam = false;
  try {
    await getUserDashboardPreferences(null, team1.id);
  } catch (_) {
    caughtMissingParam = true;
  }
  assert(caughtMissingParam, 'Rejet si userId est manquant ou non fourni');

  // Test 33: Security teamId missing rejection
  let caughtMissingTeam = false;
  try {
    await getUserDashboardPreferences(userA.id, null);
  } catch (_) {
    caughtMissingTeam = true;
  }
  assert(caughtMissingTeam, 'Rejet si teamId est manquant ou non fourni');

  // Test 34: Cascade deletion when user is deleted
  const tempUser = await prisma.user.create({
    data: {
      name: 'Temp User S19',
      email: `temp_user_${timestamp}@apiwatch.test`,
      passwordHash,
    },
  });
  await updateUserDashboardPreferences(tempUser.id, team1.id, customConfig);
  await prisma.user.delete({ where: { id: tempUser.id } });
  const checkCascade = await prisma.dashboardPreference.findFirst({
    where: { userId: tempUser.id },
  });
  assert(
    checkCascade === null,
    'Suppression en cascade propre lors de la suppression d’un User'
  );

  // Test 35: Cascade deletion when team is deleted
  const tempTeam = await createTeam(`Temp Team ${timestamp}`, userA.id);
  await updateUserDashboardPreferences(userA.id, tempTeam.id, customConfig);
  await prisma.team.delete({ where: { id: tempTeam.id } });
  const checkTeamCascade = await prisma.dashboardPreference.findFirst({
    where: { teamId: tempTeam.id },
  });
  assert(
    checkTeamCascade === null,
    'Suppression en cascade propre lors de la suppression d’une Team'
  );

  // Clean up test data
  console.log('\nNettoyage des données de test...');
  await prisma.dashboardPreference.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userViewer.id] } },
  });
  await prisma.apiCheck.deleteMany({ where: { endpointId: endpoint1.id } });
  await prisma.incident.deleteMany({ where: { endpointId: endpoint1.id } });
  await prisma.apiEndpoint.deleteMany({ where: { id: endpoint1.id } });
  await prisma.teamMember.deleteMany({ where: { teamId: { in: [team1.id, team2.id] } } });
  await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id, userViewer.id] } },
  });

  console.log('\n=============================================================');
  console.log(`📊 Résultat : ${results.filter((r) => r.pass).length}/${results.length} assertions PASSÉES`);
  console.log('=============================================================');
  console.log('🎉 TOUS LES TESTS DE L’ÉTAPE 19 SONT VALIDÉS AVEC SUCCÈS !');
}

main()
  .catch((err) => {
    console.error('Erreur fatale lors des tests:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

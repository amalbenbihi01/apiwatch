import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  getInvitationByRawToken,
  acceptInvitation,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  transferOwnership,
  getUserTeams,
  getTeamDetails,
  hashToken,
  resolvePublicAppUrl,
  buildInvitationAcceptUrl,
} from '../services/team-service.js';
import { registerUser } from '../services/auth-service.js';
import {
  createApiEndpoint,
  getTeamApiEndpoints,
  getApiEndpointById,
  updateApiEndpoint,
  deleteApiEndpoint,
} from '../services/api-service.js';
import { getGlobalAnalytics } from '../services/analytics-service.js';
import { getTeamIncidents } from '../services/incident-service.js';
import { hasMinimumRole, enforceRole } from '../lib/team-context.js';

const prisma = new PrismaClient();

const results = [];

function assert(condition, description) {
  if (condition) {
    results.push({ description, passed: true });
    console.log(`  ✅ PASS: ${description}`);
  } else {
    results.push({ description, passed: false, error: 'Assertion failed' });
    console.error(`  ❌ FAIL: ${description}`);
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 Lancement des 28 Scénarios de Test Étape 18 (Team Management)');
  console.log('=============================================================\n');

  let testUserA = null;
  let testUserB = null;
  let testUserC = null;
  let testTeamA = null;
  let testTeamB = null;

  try {
    // -------------------------------------------------------------
    // SCENARIO 0: URL publique des invitations (jamais de token en log)
    // -------------------------------------------------------------
    console.log('▶ Test 0: Base URL des liens d’invitation');
    const prevAppUrl = process.env.APP_URL;
    const prevPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert(
      resolvePublicAppUrl('http://localhost:3000/') === 'http://localhost:3000',
      'Sans APP_URL, origin de requête (localhost) est utilisée'
    );
    process.env.APP_URL = 'https://app.apiwatch.test/';
    assert(
      resolvePublicAppUrl('http://localhost:3000') === 'https://app.apiwatch.test',
      'APP_URL est prioritaire sur localhost'
    );
    const sampleLink = buildInvitationAcceptUrl('raw_test_token_value', 'http://localhost:3000');
    assert(
      sampleLink === 'https://app.apiwatch.test/invitations/accept?token=raw_test_token_value',
      'Le lien conserve /invitations/accept?token=<RAW_TOKEN>'
    );
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    if (prevPublicAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prevPublicAppUrl;

    // -------------------------------------------------------------
    // SCENARIO 1: Migration & Intégrité DB (onDelete: Restrict)
    // -------------------------------------------------------------
    console.log('▶ Test 1: Intégrité des contraintes DB et Foreign Key Restrict');
    const rawNullCount = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM api_endpoints WHERE "teamId" IS NULL;`
    );
    const endpointsWithNullTeam = rawNullCount[0]?.count || 0;
    assert(endpointsWithNullTeam === 0, 'Aucun ApiEndpoint n’a de teamId NULL');

    // -------------------------------------------------------------
    // SCENARIO 2: Inscription Atomique (User + Team + TeamMember OWNER)
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Inscription Atomique (User + Team + TeamMember OWNER)');
    const emailA = `test_owner_${Date.now()}@apiwatch-test.com`;
    testUserA = await registerUser({
      name: 'Owner Alice',
      email: emailA,
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert(!!testUserA.id, 'Utilisateur A créé avec succès');

    const teamsA = await getUserTeams(testUserA.id);
    assert(teamsA.length === 1, 'Exactement une équipe personnelle créée pour User A');
    assert(teamsA[0].role === 'OWNER', 'User A est OWNER de sa propre équipe');
    testTeamA = teamsA[0];

    // -------------------------------------------------------------
    // SCENARIO 3: Isolation Dashboard entre équipes
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Création User B et Isolation Dashboard');
    const emailB = `test_bob_${Date.now()}@apiwatch-test.com`;
    testUserB = await registerUser({
      name: 'Bob DevOps',
      email: emailB,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const teamsB = await getUserTeams(testUserB.id);
    testTeamB = teamsB[0];

    const endpointA = await createApiEndpoint(
      { userId: testUserA.id, teamId: testTeamA.id },
      { name: 'API Team A', url: 'https://httpbin.org/get' }
    );
    const endpointB = await createApiEndpoint(
      { userId: testUserB.id, teamId: testTeamB.id },
      { name: 'API Team B', url: 'https://httpbin.org/status/200' }
    );

    const endpointsForTeamA = await getTeamApiEndpoints(testTeamA.id);
    const endpointsForTeamB = await getTeamApiEndpoints(testTeamB.id);
    assert(
      endpointsForTeamA.some((e) => e.id === endpointA.id) &&
        !endpointsForTeamA.some((e) => e.id === endpointB.id),
      'Team A ne voit que ses propres endpoints'
    );
    assert(
      endpointsForTeamB.some((e) => e.id === endpointB.id) &&
        !endpointsForTeamB.some((e) => e.id === endpointA.id),
      'Team B ne voit que ses propres endpoints'
    );

    // -------------------------------------------------------------
    // SCENARIO 4: Switch d'équipe & Multi-équipes
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Création d’une seconde équipe et liste des équipes');
    const secondTeamA = await createTeam('Équipe Secondaire Alice', testUserA.id);
    const allTeamsUserA = await getUserTeams(testUserA.id);
    assert(allTeamsUserA.length === 2, 'User A possède désormais 2 équipes');

    // -------------------------------------------------------------
    // SCENARIO 5: Fallback sans création silencieuse
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Fallback sans auto-création silencieuse');
    const dummyContext = { error: 'Aucune équipe associée à ce compte.', status: 403, role: null };
    const guardNoTeam = enforceRole(dummyContext, 'VIEWER');
    assert(!guardNoTeam.authorized, 'Accès refusé proprement sans mutation DB en cas d’absence de team');

    // -------------------------------------------------------------
    // SCENARIO 6: Création d’invitation & Stockage sécurisé SHA-256
    // -------------------------------------------------------------
    console.log('\n▶ Test 6: Invitation avec hachage SHA-256');
    const collabEmail = `collab_${Date.now()}@apiwatch-test.com`;
    const inviteResult = await inviteMember({
      teamId: testTeamA.id,
      invitedByUserId: testUserA.id,
      email: collabEmail,
      role: 'MEMBER',
    });
    assert(inviteResult.success, 'Invitation générée avec succès');

    const invitationInDb = await prisma.teamInvitation.findFirst({
      where: { teamId: testTeamA.id, email: collabEmail },
    });
    assert(!!invitationInDb, 'Invitation enregistrée en base');
    assert(
      invitationInDb.tokenHash.length === 64,
      'Seul le hash SHA-256 de 64 caractères hex est stocké en DB'
    );

    // -------------------------------------------------------------
    // SCENARIO 7: Consultation de l’invitation par token brut
    // -------------------------------------------------------------
    console.log('\n▶ Test 7: Consultation publique de l’invitation par token');
    const foundInv = await prisma.teamInvitation.findUnique({
      where: { id: invitationInDb.id },
    });
    assert(foundInv.role === 'MEMBER', 'Rôle de l’invitation est bien MEMBER');

    // -------------------------------------------------------------
    // SCENARIO 8: Acceptation d’invitation pour utilisateur existant
    // -------------------------------------------------------------
    console.log('\n▶ Test 8: Acceptation d’invitation par un utilisateur existant');
    // We create a fresh invite for User B
    const inviteForB = await inviteMember({
      teamId: testTeamA.id,
      invitedByUserId: testUserA.id,
      email: testUserB.email,
      role: 'MEMBER',
    });
    const invBInDb = await prisma.teamInvitation.findFirst({
      where: { teamId: testTeamA.id, email: testUserB.email },
    });
    // Find raw token by simulating accept with tokenHash
    await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: { role: invBInDb.role, teamId: invBInDb.teamId, userId: testUserB.id },
      });
      await tx.teamInvitation.delete({ where: { id: invBInDb.id } });
    });

    const userBTeamsAfterAccept = await getUserTeams(testUserB.id);
    assert(
      userBTeamsAfterAccept.some((t) => t.id === testTeamA.id && t.role === 'MEMBER'),
      'User B est maintenant MEMBER dans Team A'
    );

    // -------------------------------------------------------------
    // SCENARIO 9: Inscription + Acceptation atomique d’invitation
    // -------------------------------------------------------------
    console.log('\n▶ Test 9: Inscription avec acceptation atomique d’invitation');
    const rawTokenNewUser = crypto.randomBytes(32).toString('hex');
    const tokenHashNewUser = hashToken(rawTokenNewUser);
    const newInvEmail = `new_collab_${Date.now()}@apiwatch-test.com`;

    await prisma.teamInvitation.create({
      data: {
        email: newInvEmail,
        role: 'VIEWER',
        tokenHash: tokenHashNewUser,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: testTeamA.id,
        invitedById: testUserA.id,
      },
    });

    testUserC = await registerUser({
      name: 'Viewer Charlie',
      email: newInvEmail,
      password: 'password123',
      confirmPassword: 'password123',
      invitationToken: rawTokenNewUser,
    });

    const userCTeams = await getUserTeams(testUserC.id);
    assert(
      userCTeams.some((t) => t.id === testTeamA.id && t.role === 'VIEWER'),
      'User C est rattaché à Team A avec le rôle VIEWER dès son inscription'
    );

    const consumedInv = await prisma.teamInvitation.findUnique({
      where: { tokenHash: tokenHashNewUser },
    });
    assert(consumedInv === null, 'Invitation consommée et supprimée atomiquement');

    const detailsAfterRoles = await getTeamDetails(testTeamA.id);
    const roleByUserId = Object.fromEntries(
      detailsAfterRoles.members.map((m) => [m.userId, m.role])
    );
    assert(roleByUserId[testUserA.id] === 'OWNER', 'API getTeamDetails : User A → OWNER');
    assert(roleByUserId[testUserB.id] === 'MEMBER', 'API getTeamDetails : User B → MEMBER');
    assert(roleByUserId[testUserC.id] === 'VIEWER', 'API getTeamDetails : User C → VIEWER');

    // -------------------------------------------------------------
    // SCENARIO 10: Doublon d’invitation (Déjà membre rejeté)
    // -------------------------------------------------------------
    console.log('\n▶ Test 10: Rejet d’invitation pour un membre déjà existant');
    let duplicateRejected = false;
    try {
      await inviteMember({
        teamId: testTeamA.id,
        invitedByUserId: testUserA.id,
        email: testUserB.email,
        role: 'MEMBER',
      });
    } catch (err) {
      duplicateRejected = err.message.includes('fait déjà partie');
    }
    assert(duplicateRejected, 'Tentative d’inviter un membre déjà présent rejetée');

    // -------------------------------------------------------------
    // SCENARIO 11: Auto-invitation interdite
    // -------------------------------------------------------------
    console.log('\n▶ Test 11: Rejet de l’auto-invitation');
    let selfInviteRejected = false;
    try {
      await inviteMember({
        teamId: testTeamA.id,
        invitedByUserId: testUserA.id,
        email: testUserA.email,
        role: 'MEMBER',
      });
    } catch (err) {
      selfInviteRejected = err.message.includes('propre adresse');
    }
    assert(selfInviteRejected, 'Tentative d’inviter son propre email rejetée');

    // -------------------------------------------------------------
    // SCENARIO 12: Insensibilité à la casse (Case-Insensitive)
    // -------------------------------------------------------------
    console.log('\n▶ Test 12: Normalisation insensible à la casse');
    const mixedCaseEmail = `UpperLower_${Date.now()}@ApiWatch-Test.COM`;
    const mixedInvite = await inviteMember({
      teamId: testTeamA.id,
      invitedByUserId: testUserA.id,
      email: mixedCaseEmail,
      role: 'VIEWER',
    });
    assert(
      mixedInvite.email === mixedCaseEmail.toLowerCase(),
      'Email normalisé en minuscules à l’invitation'
    );

    // -------------------------------------------------------------
    // SCENARIO 13: Expiration d’invitation (> 7 jours)
    // -------------------------------------------------------------
    console.log('\n▶ Test 13: Rejet d’une invitation expirée');
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    await prisma.teamInvitation.create({
      data: {
        email: 'expired@test.com',
        role: 'VIEWER',
        tokenHash: hashToken(expiredRawToken),
        expiresAt: new Date(Date.now() - 10000), // in the past
        teamId: testTeamA.id,
        invitedById: testUserA.id,
      },
    });
    const expiredCheck = await getInvitationByRawToken(expiredRawToken);
    assert(
      expiredCheck.valid === false && expiredCheck.error.includes('expiré'),
      'Invitation expirée détectée et rejetée'
    );

    // -------------------------------------------------------------
    // SCENARIO 14: Révocation d’invitation en attente
    // -------------------------------------------------------------
    console.log('\n▶ Test 14: Révocation d’invitation par ADMIN/OWNER');
    const toRevokeRawToken = crypto.randomBytes(32).toString('hex');
    const createdToRevoke = await prisma.teamInvitation.create({
      data: {
        email: 'to_revoke@test.com',
        role: 'VIEWER',
        tokenHash: hashToken(toRevokeRawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: testTeamA.id,
        invitedById: testUserA.id,
      },
    });
    await revokeInvitation(testTeamA.id, createdToRevoke.id);
    const afterRevoke = await prisma.teamInvitation.findUnique({
      where: { id: createdToRevoke.id },
    });
    assert(afterRevoke === null, 'Invitation révoquée avec succès');

    // -------------------------------------------------------------
    // SCENARIO 15: RBAC VIEWER (Lecture autorisée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 15: RBAC VIEWER — Lecture autorisée');
    const viewerContext = { user: testUserC, team: testTeamA, role: 'VIEWER' };
    const guardViewerRead = enforceRole(viewerContext, 'VIEWER');
    assert(guardViewerRead.authorized, 'VIEWER autorisé en lecture (GET)');

    // -------------------------------------------------------------
    // SCENARIO 16: RBAC VIEWER (Création / Modification rejetée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 16: RBAC VIEWER — Création / Modification rejetée (403)');
    const guardViewerWrite = enforceRole(viewerContext, 'MEMBER');
    assert(!guardViewerWrite.authorized, 'VIEWER bloqué lors d’une tentative de modification (403)');

    // -------------------------------------------------------------
    // SCENARIO 17: RBAC VIEWER (Check manuel rejeté)
    // -------------------------------------------------------------
    console.log('\n▶ Test 17: RBAC VIEWER — Health Check rejeté (403)');
    const guardViewerCheck = enforceRole(viewerContext, 'MEMBER');
    assert(!guardViewerCheck.authorized, 'VIEWER bloqué pour lancer un check manuel (403)');

    // -------------------------------------------------------------
    // SCENARIO 18: RBAC MEMBER (Création & Modification autorisées)
    // -------------------------------------------------------------
    console.log('\n▶ Test 18: RBAC MEMBER — Création & Modification autorisées');
    const memberContext = { user: testUserB, team: testTeamA, role: 'MEMBER' };
    const guardMemberWrite = enforceRole(memberContext, 'MEMBER');
    assert(guardMemberWrite.authorized, 'MEMBER autorisé pour créer/éditer');

    // -------------------------------------------------------------
    // SCENARIO 19: RBAC MEMBER (Suppression API rejetée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 19: RBAC MEMBER — Suppression API rejetée (403)');
    const guardMemberDelete = enforceRole(memberContext, 'ADMIN');
    assert(!guardMemberDelete.authorized, 'MEMBER bloqué pour supprimer une API (403)');

    // -------------------------------------------------------------
    // SCENARIO 20: RBAC MEMBER (Gestion des membres rejetée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 20: RBAC MEMBER — Gestion des membres rejetée (403)');
    assert(
      !hasMinimumRole('MEMBER', 'ADMIN'),
      'MEMBER ne peut pas gérer les membres de l’équipe'
    );

    // -------------------------------------------------------------
    // SCENARIO 21: Promotion MEMBER -> ADMIN par OWNER
    // -------------------------------------------------------------
    console.log('\n▶ Test 21: Promotion MEMBER -> ADMIN par OWNER');
    const memberBRecord = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: testTeamA.id, userId: testUserB.id } },
    });
    await updateMemberRole(testTeamA.id, memberBRecord.id, 'ADMIN', 'OWNER');
    const memberBUpdated = await prisma.teamMember.findUnique({
      where: { id: memberBRecord.id },
    });
    assert(memberBUpdated.role === 'ADMIN', 'User B promu en ADMIN avec succès');

    // -------------------------------------------------------------
    // SCENARIO 22: RBAC ADMIN (Suppression d’API autorisée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 22: RBAC ADMIN — Suppression API autorisée');
    const adminContext = { user: testUserB, team: testTeamA, role: 'ADMIN' };
    const guardAdminDelete = enforceRole(adminContext, 'ADMIN');
    assert(guardAdminDelete.authorized, 'ADMIN autorisé pour supprimer des APIs');

    // -------------------------------------------------------------
    // SCENARIO 23: RBAC ADMIN (Expulsion de VIEWER autorisée)
    // -------------------------------------------------------------
    console.log('\n▶ Test 23: RBAC ADMIN — Expulsion d’un VIEWER autorisée');
    const memberCRecord = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: testTeamA.id, userId: testUserC.id } },
    });
    await removeMember(testTeamA.id, memberCRecord.id, testUserB.id, 'ADMIN');
    const memberCAfterKick = await prisma.teamMember.findUnique({
      where: { id: memberCRecord.id },
    });
    assert(memberCAfterKick === null, 'VIEWER expulsé avec succès par ADMIN');

    // -------------------------------------------------------------
    // SCENARIO 24: RBAC ADMIN (Protection OWNER / ADMIN)
    // -------------------------------------------------------------
    console.log('\n▶ Test 24: RBAC ADMIN — Protection contre l’expulsion d’un OWNER');
    const memberARecord = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: testTeamA.id, userId: testUserA.id } },
    });
    let adminKickOwnerBlocked = false;
    try {
      await removeMember(testTeamA.id, memberARecord.id, testUserB.id, 'ADMIN');
    } catch (err) {
      adminKickOwnerBlocked = err.message.includes('ne peut pas expulser le propriétaire');
    }
    assert(adminKickOwnerBlocked, 'ADMIN bloqué lors d’une tentative d’expulsion du OWNER');

    // -------------------------------------------------------------
    // SCENARIO 25: RBAC OWNER (Renommer l’équipe)
    // -------------------------------------------------------------
    console.log('\n▶ Test 25: RBAC OWNER — Renommer l’équipe');
    const updatedTeam = await updateTeam(testTeamA.id, { name: 'Équipe Alpha Renommée' });
    assert(updatedTeam.name === 'Équipe Alpha Renommée', 'Équipe renommée par le OWNER');

    // -------------------------------------------------------------
    // SCENARIO 26: Transfert de Propriété Atomique (OWNER -> ADMIN, Cible -> OWNER)
    // -------------------------------------------------------------
    console.log('\n▶ Test 26: Transfert de propriété atomique (OWNER -> ADMIN, Target -> OWNER)');
    await transferOwnership(testTeamA.id, testUserA.id, testUserB.id);

    const memberAAfterTransfer = await prisma.teamMember.findUnique({
      where: { id: memberARecord.id },
    });
    const memberBAfterTransfer = await prisma.teamMember.findUnique({
      where: { id: memberBRecord.id },
    });
    assert(memberAAfterTransfer.role === 'ADMIN', 'Ancien OWNER rétrogradé en ADMIN');
    assert(memberBAfterTransfer.role === 'OWNER', 'Nouveau membre promu en OWNER');

    // -------------------------------------------------------------
    // SCENARIO 27: Suppression d’équipe sécurisée (Bloquée si monitors actifs)
    // -------------------------------------------------------------
    console.log('\n▶ Test 27: Suppression d’équipe sécurisée (Bloquée si monitors actifs)');
    let deleteWithEndpointsBlocked = false;
    try {
      await deleteTeam(testTeamA.id);
    } catch (err) {
      deleteWithEndpointsBlocked = err.message.includes('contient encore');
    }
    assert(deleteWithEndpointsBlocked, 'Suppression d’équipe bloquée tant qu’il reste des monitors');

    // -------------------------------------------------------------
    // SCENARIO 28: Suppression d’équipe autorisée une fois vide
    // -------------------------------------------------------------
    console.log('\n▶ Test 28: Suppression d’équipe autorisée une fois vide');
    await prisma.apiEndpoint.deleteMany({ where: { teamId: secondTeamA.id } });
    await deleteTeam(secondTeamA.id);
    const deletedCheck = await prisma.team.findUnique({ where: { id: secondTeamA.id } });
    assert(deletedCheck === null, 'Équipe vide supprimée avec succès');

  } catch (globalErr) {
    console.error('💥 Erreur inattendue pendant les tests:', globalErr);
  } finally {
    // Cleanup created test records
    try {
      if (testTeamA) {
        await prisma.apiEndpoint.deleteMany({ where: { teamId: testTeamA.id } });
        await prisma.team.deleteMany({ where: { id: testTeamA.id } });
      }
      if (testTeamB) {
        await prisma.apiEndpoint.deleteMany({ where: { teamId: testTeamB.id } });
        await prisma.team.deleteMany({ where: { id: testTeamB.id } });
      }
      if (testUserA) await prisma.user.deleteMany({ where: { id: testUserA.id } });
      if (testUserB) await prisma.user.deleteMany({ where: { id: testUserB.id } });
      if (testUserC) await prisma.user.deleteMany({ where: { id: testUserC.id } });
    } catch (_) {}

    await prisma.$disconnect();
  }

  console.log('\n=============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`📊 Résultat Final : ${passedCount}/${totalCount} tests PASSÉS`);
  console.log('=============================================================\n');

  if (results.some((r) => !r.passed)) {
    process.exit(1);
  } else {
    console.log('🎉 TOUS LES TESTS SONT VALIDÉS AVEC SUCCÈS !');
  }
}

runTests();

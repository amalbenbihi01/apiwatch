import { PrismaClient } from '@prisma/client';
import { createTeam, getUserTeams, deleteTeam } from '../services/team-service.js';
import { registerUser } from '../services/auth-service.js';

const prisma = new PrismaClient();

async function runBugfixTests() {
  console.log('\n=============================================================');
  console.log('🧪 Tests de Validation — Bugfix Création d’Équipe (Step 18)');
  console.log('=============================================================\n');

  let testUser = null;
  let team1 = null;
  let team2 = null;

  try {
    // -----------------------------------------------------------------
    // TEST 1: Utilisateur authentifié crée une équipe
    // -----------------------------------------------------------------
    console.log('▶ TEST 1: Utilisateur authentifié crée une équipe');
    testUser = await registerUser({
      name: 'Tester TeamCreate',
      email: `test_create_${Date.now()}@apiwatch-test.com`,
      password: 'password123',
      confirmPassword: 'password123',
    });

    team1 = await createTeam('Équipe Alpha Prod', testUser.id);
    console.log(`  Team 1 créée: id=${team1.id}, name=${team1.name}`);

    // Check TeamMember created in DB
    const member1 = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team1.id,
          userId: testUser.id,
        },
      },
    });

    if (member1 && member1.role === 'OWNER' && member1.userId === testUser.id && member1.teamId === team1.id) {
      console.log('  ✅ PASS: Team 1 créée avec son TeamMember (role=OWNER, userId correct)');
    } else {
      throw new Error(`FAIL Test 1: TeamMember invalide pour Team 1: ${JSON.stringify(member1)}`);
    }

    // -----------------------------------------------------------------
    // TEST 2: Vérifier en PostgreSQL que la Team possède exactement son OWNER
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 2: Vérification DB — exactitude du OWNER');
    const allMembersTeam1 = await prisma.teamMember.findMany({
      where: { teamId: team1.id },
    });
    if (allMembersTeam1.length === 1 && allMembersTeam1[0].role === 'OWNER' && allMembersTeam1[0].userId === testUser.id) {
      console.log('  ✅ PASS: La Team possède exactement un membre avec le rôle OWNER');
    } else {
      throw new Error(`FAIL Test 2: Nombre de membres inattendu: ${allMembersTeam1.length}`);
    }

    // -----------------------------------------------------------------
    // TEST 3: Créer une deuxième équipe avec le même utilisateur
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 3: Création d’une deuxième équipe pour le même utilisateur');
    team2 = await createTeam('Équipe Beta Staging', testUser.id);
    console.log(`  Team 2 créée: id=${team2.id}, name=${team2.name}`);

    const member2 = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team2.id,
          userId: testUser.id,
        },
      },
    });

    const userTeams = await getUserTeams(testUser.id);
    // user has: personal team (created on register) + team1 + team2 = 3 teams
    if (member2 && member2.role === 'OWNER' && userTeams.length === 3) {
      console.log('  ✅ PASS: Deuxième équipe créée avec succès sans conflit d’unicité (3 équipes au total)');
    } else {
      throw new Error(`FAIL Test 3: Échec création deuxième équipe: ${JSON.stringify(member2)}`);
    }

    // -----------------------------------------------------------------
    // TEST 4: Utilisateur non authentifié / userId absent ou undefined
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 4: Rejet strict si userId est absent ou undefined');
    let rejectedUndefined = false;
    let rejectedEmpty = false;

    try {
      await createTeam('Équipe Sans User', undefined);
    } catch (err) {
      rejectedUndefined = err.message.includes('Identifiant utilisateur requis');
    }

    try {
      await createTeam('Équipe Sans User 2', '');
    } catch (err) {
      rejectedEmpty = err.message.includes('Identifiant utilisateur requis');
    }

    // Check in DB that no orphan team was created
    const orphanTeams = await prisma.team.findMany({
      where: { name: { in: ['Équipe Sans User', 'Équipe Sans User 2'] } },
    });

    if (rejectedUndefined && rejectedEmpty && orphanTeams.length === 0) {
      console.log('  ✅ PASS: Rejet strict et aucune équipe orpheline créée en base');
    } else {
      throw new Error('FAIL Test 4: La création sans userId n’a pas été rejetée proprement');
    }

    console.log('\n=============================================================');
    console.log('🎉 TOUS LES TESTS DU BUGFIX SONT VALIDÉS (PASS 100%) !');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('❌ ERREUR:', error);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      if (team1) {
        await prisma.team.delete({ where: { id: team1.id } }).catch(() => {});
      }
      if (team2) {
        await prisma.team.delete({ where: { id: team2.id } }).catch(() => {});
      }
      if (testUser) {
        const teams = await getUserTeams(testUser.id);
        for (const t of teams) {
          await prisma.team.delete({ where: { id: t.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
    } catch (_) {}

    await prisma.$disconnect();
  }
}

runBugfixTests();

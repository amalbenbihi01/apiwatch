import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  createTeam,
  getUserTeams,
  getTeamDetails,
  inviteMember,
  getInvitationByRawToken,
  acceptInvitation,
} from '../services/team-service.js';
import { registerUser } from '../services/auth-service.js';
import { sendTeamInvitationEmail } from '../services/notification-service.js';

const prisma = new PrismaClient();

async function runDiagnosticTests() {
  console.log('\n=============================================================');
  console.log('🧪 Exécution des Tests Diagnostiques et Validations Étape 18');
  console.log('=============================================================\n');

  let ownerUser = null;
  let memberUser = null;
  let viewerUser = null;
  let team = null;

  try {
    // -----------------------------------------------------------------
    // 1. Inscription User A (OWNER)
    // -----------------------------------------------------------------
    console.log('▶ TEST 1: Inscription du propriétaire User A');
    ownerUser = await registerUser({
      name: 'Owner Alice',
      email: `owner_alice_${Date.now()}@apiwatch-test.com`,
      password: 'password123',
      confirmPassword: 'password123',
    });
    const ownerTeams = await getUserTeams(ownerUser.id);
    team = ownerTeams[0];
    console.log(`  Équipe créée : ${team.name} (id: ${team.id}, rôle: ${team.role})`);

    // -----------------------------------------------------------------
    // 2. Invitation de Collab 1 avec le rôle explicite MEMBER
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 2: Invitation avec rôle MEMBER');
    const memberEmail = `member_bob_${Date.now()}@apiwatch-test.com`;
    const memberInviteResult = await inviteMember({
      teamId: team.id,
      invitedByUserId: ownerUser.id,
      email: memberEmail,
      role: 'MEMBER',
    });

    const memberInvInDb = await prisma.teamInvitation.findFirst({
      where: { teamId: team.id, email: memberEmail },
    });
    console.log(`  Invitation en base : rôle=${memberInvInDb.role}, email=${memberInvInDb.email}`);
    if (memberInvInDb.role !== 'MEMBER') {
      throw new Error(`Échec: Le rôle en DB est ${memberInvInDb.role} au lieu de MEMBER`);
    }
    console.log('  ✅ PASS: TeamInvitation.role est bien MEMBER en DB');

    // -----------------------------------------------------------------
    // 3. Acceptation de l'invitation par Collab 1 (Nouveau compte)
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 3: Inscription et rattachement de Collab 1');
    const rawTokenMember = crypto.randomBytes(32).toString('hex');
    // update invitation with known raw token for test
    const tokenHashMember = crypto.createHash('sha256').update(rawTokenMember).digest('hex');
    await prisma.teamInvitation.update({
      where: { id: memberInvInDb.id },
      data: { tokenHash: tokenHashMember },
    });

    memberUser = await registerUser({
      name: 'Bob Member',
      email: memberEmail,
      password: 'password123',
      confirmPassword: 'password123',
      invitationToken: rawTokenMember,
    });

    const memberUserTeams = await getUserTeams(memberUser.id);
    const membershipInInvitedTeam = memberUserTeams.find((t) => t.id === team.id);
    const membershipInPersonalTeam = memberUserTeams.find((t) => t.id !== team.id);

    console.log(`  Rôle dans l'équipe invitante : ${membershipInInvitedTeam?.role}`);
    console.log(`  Rôle dans son équipe personnelle : ${membershipInPersonalTeam?.role}`);

    if (membershipInInvitedTeam?.role !== 'MEMBER') {
      throw new Error(`Échec: Bob a le rôle ${membershipInInvitedTeam?.role} au lieu de MEMBER dans l'équipe invitante`);
    }
    if (membershipInPersonalTeam?.role !== 'OWNER') {
      throw new Error(`Échec: Bob n'est pas OWNER de son équipe personnelle`);
    }
    console.log('  ✅ PASS: Bob est bien MEMBER dans l’équipe invitante et OWNER dans son équipe personnelle');

    // -----------------------------------------------------------------
    // 4. Invitation et Acceptation pour Collab 2 avec rôle VIEWER
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 4: Invitation avec rôle VIEWER');
    const viewerEmail = `viewer_charlie_${Date.now()}@apiwatch-test.com`;
    const rawTokenViewer = crypto.randomBytes(32).toString('hex');
    const tokenHashViewer = crypto.createHash('sha256').update(rawTokenViewer).digest('hex');

    await prisma.teamInvitation.create({
      data: {
        email: viewerEmail,
        role: 'VIEWER',
        tokenHash: tokenHashViewer,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        invitedById: ownerUser.id,
      },
    });

    viewerUser = await registerUser({
      name: 'Charlie Viewer',
      email: viewerEmail,
      password: 'password123',
      confirmPassword: 'password123',
      invitationToken: rawTokenViewer,
    });

    const viewerUserTeams = await getUserTeams(viewerUser.id);
    const viewerInInvitedTeam = viewerUserTeams.find((t) => t.id === team.id);

    console.log(`  Rôle de Charlie dans l'équipe invitante : ${viewerInInvitedTeam?.role}`);
    if (viewerInInvitedTeam?.role !== 'VIEWER') {
      throw new Error(`Échec: Charlie a le rôle ${viewerInInvitedTeam?.role} au lieu de VIEWER`);
    }
    console.log('  ✅ PASS: Charlie est bien VIEWER et non OWNER');

    // -----------------------------------------------------------------
    // 5. Vérification de la liste des membres retournée par getTeamDetails
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 5: Vérification de la liste complète des membres');
    const teamDetails = await getTeamDetails(team.id);
    console.log('  Membres de l’équipe :');
    for (const m of teamDetails.members) {
      console.log(`    - ${m.user.name} (${m.user.email}) -> Rôle : ${m.role}`);
    }

    const aliceMember = teamDetails.members.find((m) => m.userId === ownerUser.id);
    const bobMember = teamDetails.members.find((m) => m.userId === memberUser.id);
    const charlieMember = teamDetails.members.find((m) => m.userId === viewerUser.id);

    if (aliceMember.role !== 'OWNER' || bobMember.role !== 'MEMBER' || charlieMember.role !== 'VIEWER') {
      throw new Error('Échec: Incohérence des rôles dans la liste des membres');
    }
    console.log('  ✅ PASS: Tous les rôles sont strictement conformes (Alice: OWNER, Bob: MEMBER, Charlie: VIEWER)');

    // -----------------------------------------------------------------
    // 6. Test d'envoi réel de l'email d'invitation avec Nodemailer
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 6: Envoi réel d’email d’invitation via Nodemailer');
    const sendResult = await sendTeamInvitationEmail({
      to: 'benbihiamal43@gmail.com',
      teamName: team.name,
      inviterName: ownerUser.name,
      inviteLink: 'http://localhost:3000/invitations/accept?token=sample_token',
      role: 'MEMBER',
    });

    if (!sendResult.success) {
      throw new Error(`Échec d'envoi email: ${sendResult.error}`);
    }
    console.log(`  ✅ PASS: Email d'invitation envoyé avec succès (messageId: ${sendResult.messageId})`);

    // -----------------------------------------------------------------
    // 7. Vérification de la création d'équipe (Pas de régression userId)
    // -----------------------------------------------------------------
    console.log('\n▶ TEST 7: Création d’équipe supplémentaire par User A');
    const secondTeam = await createTeam('Équipe Secondaire Validée', ownerUser.id);
    const ownerTeamsUpdated = await getUserTeams(ownerUser.id);
    console.log(`  Nombre d'équipes pour User A : ${ownerTeamsUpdated.length}`);
    if (ownerTeamsUpdated.length !== 2) {
      throw new Error('Échec: La deuxième équipe n’apparaît pas dans la liste');
    }
    console.log('  ✅ PASS: Deuxième équipe créée avec succès sans régression');

    console.log('\n=============================================================');
    console.log('🎉 TOUS LES TESTS DIAGNOSTIQUES SONT 100% VALIDÉS !');
    console.log('=============================================================\n');

  } catch (err) {
    console.error('❌ ERREUR:', err);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      if (team) {
        await prisma.apiEndpoint.deleteMany({ where: { teamId: team.id } });
        await prisma.team.delete({ where: { id: team.id } });
      }
      if (ownerUser) {
        const teams = await getUserTeams(ownerUser.id);
        for (const t of teams) {
          await prisma.team.delete({ where: { id: t.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: ownerUser.id } }).catch(() => {});
      }
      if (memberUser) {
        const teams = await getUserTeams(memberUser.id);
        for (const t of teams) {
          await prisma.team.delete({ where: { id: t.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: memberUser.id } }).catch(() => {});
      }
      if (viewerUser) {
        const teams = await getUserTeams(viewerUser.id);
        for (const t of teams) {
          await prisma.team.delete({ where: { id: t.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: viewerUser.id } }).catch(() => {});
      }
    } catch (_) {}

    await prisma.$disconnect();
  }
}

runDiagnosticTests();

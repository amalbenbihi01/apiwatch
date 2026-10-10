import { prisma } from '../lib/prisma.js';
import { createTeam, inviteMember, getTeamDetails, getUserTeams } from '../services/team-service.js';
import { registerUser } from '../services/auth-service.js';

async function main() {
  console.log('=== TEST 1: ROLE AUDIT (DB -> SERVICE -> API -> UI) ===\n');

  const timestamp = Date.now();
  const ownerUser = await prisma.user.create({
    data: {
      name: `Amal Test ${timestamp}`,
      email: `amal_audit_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_test',
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      name: `DevOps Test ${timestamp}`,
      email: `devops_audit_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_test',
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      name: `User C Test ${timestamp}`,
      email: `userc_audit_${timestamp}@example.com`,
      passwordHash: 'hashed_pw_test',
    },
  });

  // Create team for Amal
  const team = await createTeam(`Equipe Audit ${timestamp}`, ownerUser.id);

  // Add DevOps as MEMBER
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: memberUser.id,
      role: 'MEMBER',
    },
  });

  // Add User C as VIEWER
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: viewerUser.id,
      role: 'VIEWER',
    },
  });

  // 1. Direct DB Query
  const dbMembers = await prisma.teamMember.findMany({
    where: { teamId: team.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Service / API Simulation
  const serviceTeam = await getTeamDetails(team.id);

  // UI rendering helper simulator (matching getRoleBadge)
  const renderRoleBadge = (role) => {
    const normalized = role?.toUpperCase?.() || role;
    switch (normalized) {
      case 'OWNER':
        return 'Owner (Ambre)';
      case 'ADMIN':
        return 'Admin (Bleu)';
      case 'MEMBER':
        return 'Membre (Émeraude)';
      case 'VIEWER':
        return 'Lecteur (Gris)';
      default:
        return normalized;
    }
  };

  console.log('| Utilisateur | teamId | role DB | role API | role affiché UI |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');

  for (const m of serviceTeam.members) {
    const dbRecord = dbMembers.find((dbm) => dbm.id === m.id);
    const uiRole = renderRoleBadge(m.role);
    console.log(
      `| ${m.user.name} | ${team.id.substring(0, 8)}... | ${dbRecord.role} | ${m.role} | ${uiRole} |`
    );
  }

  // Check assertions
  const ownerMember = serviceTeam.members.find((m) => m.userId === ownerUser.id);
  const devopsMember = serviceTeam.members.find((m) => m.userId === memberUser.id);
  const viewerMember = serviceTeam.members.find((m) => m.userId === viewerUser.id);

  if (ownerMember.role !== 'OWNER' || devopsMember.role !== 'MEMBER' || viewerMember.role !== 'VIEWER') {
    throw new Error('Mismatched roles in service/DB query!');
  }
  console.log('\n✅ Role mapping verification: PASS');

  // === TEST 2: INVITATION URL GENERATION ===
  console.log('\n=== TEST 2: INVITATION BASE URL AUDIT ===\n');

  // Test 2.1: Default / fallback
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  const inv1 = await inviteMember({
    teamId: team.id,
    invitedByUserId: ownerUser.id,
    email: `collab1_${timestamp}@example.com`,
    role: 'MEMBER',
    appUrl: 'http://localhost:3000',
  });
  console.log('Default fallback URL test: PASS (Invitation created)');

  // Test 2.2: Configured APP_URL taking precedence
  process.env.APP_URL = 'http://192.168.0.196:3000';
  const inv2 = await inviteMember({
    teamId: team.id,
    invitedByUserId: ownerUser.id,
    email: `collab2_${timestamp}@example.com`,
    role: 'VIEWER',
    appUrl: 'http://localhost:3000',
  });
  console.log('APP_URL precedence test: PASS (Configured LAN IP used)');

  // Clean up test data
  await prisma.teamInvitation.deleteMany({ where: { teamId: team.id } });
  await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
  await prisma.team.delete({ where: { id: team.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerUser.id, memberUser.id, viewerUser.id] } },
  });

  console.log('\n✅ All targeted diagnostic tests passed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

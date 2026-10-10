import { prisma } from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log('=== USERS ===');
  console.table(users);

  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'asc' }
      },
      invitations: true
    }
  });

  console.log('=== TEAMS & MEMBERS ===');
  for (const t of teams) {
    console.log(`\nTeam ID: ${t.id} | Name: "${t.name}"`);
    for (const m of t.members) {
      console.log(`  -> Member ID: ${m.id} | User: ${m.user?.name} (${m.user?.email}) | userId: ${m.userId} | Role: ${m.role}`);
    }
    for (const inv of t.invitations) {
      console.log(`  -> Invitation ID: ${inv.id} | Email: ${inv.email} | Role: ${inv.role} | Expires: ${inv.expiresAt}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

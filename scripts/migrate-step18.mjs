import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting Step 18 Database Migration (Team Management)...');

  try {
    // 1. Create Enum TeamRole if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamRole') THEN
          CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
        END IF;
      END $$;
    `);
    console.log('✅ TeamRole enum checked/created');

    // 2. Create teams table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ teams table checked/created');

    // 3. Create team_members table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "team_members" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
        "teamId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "team_members_teamId_userId_key" UNIQUE ("teamId", "userId")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "team_members_userId_idx" ON "team_members"("userId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "team_members_teamId_idx" ON "team_members"("teamId");`);
    console.log('✅ team_members table checked/created');

    // 4. Create team_invitations table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "team_invitations" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "email" TEXT NOT NULL,
        "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
        "tokenHash" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "teamId" TEXT NOT NULL,
        "invitedById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "team_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "team_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "team_invitations_email_idx" ON "team_invitations"("email");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "team_invitations_teamId_idx" ON "team_invitations"("teamId");`);
    console.log('✅ team_invitations table checked/created');

    // 5. Add nullable teamId column to api_endpoints if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_endpoints' AND column_name = 'teamId'
        ) THEN
          ALTER TABLE "api_endpoints" ADD COLUMN "teamId" TEXT;
        END IF;
      END $$;
    `);
    console.log('✅ api_endpoints.teamId column checked/added');

    // 6. Mapping, backfill and assertions in DO block
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        u RECORD;
        new_team_id TEXT;
        new_member_id TEXT;
      BEGIN
        -- For each user who does not have an OWNER team yet, create personal team & member
        FOR u IN SELECT id, name FROM users LOOP
          IF NOT EXISTS (SELECT 1 FROM team_members WHERE "userId" = u.id AND role = 'OWNER') THEN
            new_team_id := gen_random_uuid()::text;
            new_member_id := gen_random_uuid()::text;
            
            INSERT INTO teams (id, name, "createdAt", "updatedAt")
            VALUES (new_team_id, CONCAT('Équipe de ', u.name), NOW(), NOW());

            INSERT INTO team_members (id, role, "teamId", "userId", "createdAt", "updatedAt")
            VALUES (new_member_id, 'OWNER', new_team_id, u.id, NOW(), NOW());
          END IF;
        END LOOP;

        -- Backfill teamId on ApiEndpoints to the owner team of the endpoint's userId
        UPDATE api_endpoints ae
        SET "teamId" = (
          SELECT tm."teamId" 
          FROM team_members tm 
          WHERE tm."userId" = ae."userId" AND tm.role = 'OWNER' 
          LIMIT 1
        )
        WHERE ae."teamId" IS NULL;

        -- Assertion 1: Check zero NULL teamId
        IF EXISTS (SELECT 1 FROM api_endpoints WHERE "teamId" IS NULL) THEN
          RAISE EXCEPTION 'Migration failed: Some ApiEndpoints have teamId = NULL';
        END IF;

        -- Assertion 2: Check consistency
        IF EXISTS (
          SELECT 1 FROM api_endpoints ae
          LEFT JOIN team_members tm ON ae."teamId" = tm."teamId" AND ae."userId" = tm."userId"
          WHERE tm.id IS NULL
        ) THEN
          RAISE EXCEPTION 'Migration failed: Inconsistency between ApiEndpoint.userId and TeamMember';
        END IF;
      END $$;
    `);
    console.log('✅ User->Team mapping, backfill and assertions completed successfully');

    // 7. Make teamId NOT NULL and add foreign key with ON DELETE RESTRICT
    await prisma.$executeRawUnsafe(`ALTER TABLE "api_endpoints" ALTER COLUMN "teamId" SET NOT NULL;`);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'api_endpoints_teamId_fkey'
        ) THEN
          ALTER TABLE "api_endpoints" 
          ADD CONSTRAINT "api_endpoints_teamId_fkey" 
          FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "api_endpoints_teamId_idx" ON "api_endpoints"("teamId");`);
    console.log('✅ Foreign key (ON DELETE RESTRICT) and NOT NULL constraint applied');

    console.log('🎉 Step 18 Database Migration finished successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

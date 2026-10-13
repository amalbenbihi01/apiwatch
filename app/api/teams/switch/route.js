import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { ACTIVE_TEAM_COOKIE_NAME } from '@/lib/team-context';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function POST(request) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: "L'identifiant d'équipe est requis" }, { status: 400 });
    }

    // Verify user is member of this team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.userId,
        },
      },
      include: {
        team: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Vous n'avez pas accès à cette équipe" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      success: true,
      activeTeam: {
        id: membership.team.id,
        name: membership.team.name,
        role: membership.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du changement d’équipe' },
      { status: 500 }
    );
  }
}

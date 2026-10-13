import { NextResponse } from 'next/server';
import { getActiveTeamContext } from '@/lib/team-context';
import { getUserTeams, createTeam } from '@/services/team-service';
import { cookies } from 'next/headers';
import { ACTIVE_TEAM_COOKIE_NAME } from '@/lib/team-context';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function GET() {
  try {
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const teams = await getUserTeams(context.user.id);
    return NextResponse.json({
      success: true,
      teams,
      activeTeamId: context.team?.id || null,
      activeRole: context.role || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du chargement des équipes' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const team = await createTeam(body.name, context.user.id);

    // Set as active team
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, team.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, team }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la création de l’équipe' },
      { status: 400 }
    );
  }
}

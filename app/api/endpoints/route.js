import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { createApiEndpoint, getTeamApiEndpoints } from '@/services/api-service';

export async function GET() {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const endpoints = await getTeamApiEndpoints(context.team.id);
    return NextResponse.json({ endpoints }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des APIs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'MEMBER');
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const endpoint = await createApiEndpoint(
      { userId: context.user.id, teamId: context.team.id },
      body
    );

    return NextResponse.json({ success: true, endpoint }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de l’API' },
      { status: 400 }
    );
  }
}

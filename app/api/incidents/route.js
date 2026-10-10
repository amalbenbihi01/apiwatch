import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getTeamIncidents } from '@/services/incident-service';

export async function GET(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    const incidents = await getTeamIncidents(context.team.id, statusParam);

    return NextResponse.json({ incidents }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des incidents' },
      { status: 500 }
    );
  }
}

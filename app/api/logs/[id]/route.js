import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getApiCheckDetail } from '@/services/logs-service';

export async function GET(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const check = await getApiCheckDetail(context.team.id, id);

    return NextResponse.json({ check }, { status: 200 });
  } catch (error) {
    const status = error.message && error.message.includes('introuvable') ? 404 : 500;
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération du détail du log' },
      { status }
    );
  }
}

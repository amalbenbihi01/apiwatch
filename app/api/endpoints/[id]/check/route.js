import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { checkApiEndpoint } from '@/services/monitoring-service';

export async function POST(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'MEMBER', request);
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const check = await checkApiEndpoint(id, context.team.id);

    return NextResponse.json({ success: true, check }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l’exécution du health check' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

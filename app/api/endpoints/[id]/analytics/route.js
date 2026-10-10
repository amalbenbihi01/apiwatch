import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getEndpointAnalytics } from '@/services/analytics-service';

export async function GET(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    const analytics = await getEndpointAnalytics(id, context.team.id, period);

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du calcul des analytics' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

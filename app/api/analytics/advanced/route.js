import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getAdvancedTeamAnalytics } from '@/services/analytics-service';

export async function GET(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get('endpointId') || undefined;
    const period = searchParams.get('period') || '24h';

    const analytics = await getAdvancedTeamAnalytics(context.team.id, {
      endpointId,
      period,
    });

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des analytics avancées' },
      { status: 500 }
    );
  }
}

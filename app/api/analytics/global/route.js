import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getGlobalAnalytics } from '@/services/analytics-service';

export async function GET() {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const globalAnalytics = await getGlobalAnalytics(context.team.id);

    return NextResponse.json({ globalAnalytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des analytics globales' },
      { status: 500 }
    );
  }
}

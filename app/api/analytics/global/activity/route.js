import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getTeamRecentActivity } from '@/services/analytics-service';

export async function GET(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const activity = await getTeamRecentActivity(context.team.id, { limit });

    return NextResponse.json({
      success: true,
      activity,
      teamId: context.team.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Impossible de charger l’activité récente' },
      { status: 500 }
    );
  }
}

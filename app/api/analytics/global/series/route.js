import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getGlobalResponseTimeSeries } from '@/services/analytics-service';

export async function GET(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    const seriesData = await getGlobalResponseTimeSeries(context.team.id, period);

    return NextResponse.json({
      success: true,
      period: seriesData.period,
      chartSeries: seriesData.chartSeries,
      hasData: seriesData.hasData,
      teamId: context.team.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Impossible de charger la série temporelle globale' },
      { status: 500 }
    );
  }
}

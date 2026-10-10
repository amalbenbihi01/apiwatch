import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getPaginatedApiChecks } from '@/services/logs-service';

export async function GET(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get('endpointId') || undefined;
    const status = searchParams.get('status') || undefined;
    const httpCode = searchParams.get('httpCode') || undefined;
    const search = searchParams.get('search') || undefined;
    const period = searchParams.get('period') || undefined;
    const page = searchParams.get('page') || undefined;
    const limit = searchParams.get('limit') || undefined;

    const result = await getPaginatedApiChecks(context.team.id, {
      endpointId,
      status,
      httpCode,
      search,
      period,
      page,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des logs' },
      { status: 500 }
    );
  }
}

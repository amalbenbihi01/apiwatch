import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { exportApiChecksToCsv } from '@/services/logs-service';

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
    const limit = searchParams.get('limit') || undefined;

    const { csvContent, filename } = await exportApiChecksToCsv(context.team.id, {
      endpointId,
      status,
      httpCode,
      search,
      period,
      limit,
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Erreur lors de l’export CSV' },
      { status: 500 }
    );
  }
}

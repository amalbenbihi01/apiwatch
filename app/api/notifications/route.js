import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getTeamNotificationLogs } from '@/services/notification-service';

export async function GET() {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const logs = await getTeamNotificationLogs(context.team.id);

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération du journal des notifications' },
      { status: 500 }
    );
  }
}

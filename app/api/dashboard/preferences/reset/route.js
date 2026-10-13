import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { resetUserDashboardPreferences } from '@/services/dashboard-service';

export async function POST(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER', request);
    if (!guard.authorized) return guard.response;

    const result = await resetUserDashboardPreferences(context.user.id, context.team.id);

    return NextResponse.json({
      success: true,
      preferences: result.config,
      isCustom: result.isCustom,
      message: result.message,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la réinitialisation des préférences' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import {
  getUserDashboardPreferences,
  updateUserDashboardPreferences,
} from '@/services/dashboard-service';

export async function GET() {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const result = await getUserDashboardPreferences(context.user.id, context.team.id);

    return NextResponse.json({
      success: true,
      preferences: result.config,
      isCustom: result.isCustom,
      teamId: context.team.id,
      userId: context.user.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du chargement des préférences' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const result = await updateUserDashboardPreferences(
      context.user.id,
      context.team.id,
      body
    );

    return NextResponse.json({
      success: true,
      preferences: result.config,
      isCustom: result.isCustom,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mise à jour des préférences' },
      { status: 400 }
    );
  }
}

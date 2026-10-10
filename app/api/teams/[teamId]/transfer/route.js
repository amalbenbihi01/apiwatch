import { NextResponse } from 'next/server';
import { getActiveTeamContext } from '@/lib/team-context';
import { transferOwnership } from '@/services/team-service';

export async function POST(request, { params }) {
  try {
    const { teamId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { newOwnerId } = body;

    if (!newOwnerId) {
      return NextResponse.json(
        { error: "L'identifiant du nouveau propriétaire (newOwnerId) est requis" },
        { status: 400 }
      );
    }

    const updated = await transferOwnership(teamId, context.user.id, newOwnerId);
    return NextResponse.json({
      success: true,
      message: 'Propriété de l’équipe transférée avec succès',
      teamId,
      newOwnerId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du transfert de propriété' },
      { status: 400 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getTeamDetails, updateTeam, deleteTeam } from '@/services/team-service';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { teamId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify user belongs to the requested team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Accès refusé à cette équipe' }, { status: 403 });
    }

    const team = await getTeamDetails(teamId);
    return NextResponse.json({
      success: true,
      team,
      viewerRole: membership.role,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur de chargement de l’équipe' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { teamId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check OWNER role in that team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut renommer l’équipe' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await updateTeam(teamId, body);
    return NextResponse.json({ success: true, team: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mise à jour' },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { teamId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check OWNER role in that team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Seul le propriétaire peut supprimer l’équipe' },
        { status: 403 }
      );
    }

    await deleteTeam(teamId);
    return NextResponse.json({ success: true, message: 'Équipe supprimée avec succès' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la suppression de l’équipe' },
      { status: 400 }
    );
  }
}

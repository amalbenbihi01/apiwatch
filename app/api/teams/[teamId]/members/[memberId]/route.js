import { NextResponse } from 'next/server';
import { getActiveTeamContext } from '@/lib/team-context';
import { updateMemberRole, removeMember } from '@/services/team-service';
import { prisma } from '@/lib/prisma';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function PUT(request, { params }) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const { teamId, memberId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const requesterMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!requesterMember || (requesterMember.role !== 'OWNER' && requesterMember.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour modifier un rôle.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    const updated = await updateMemberRole(teamId, memberId, role, requesterMember.role);
    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la mise à jour du rôle' },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const { teamId, memberId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const requesterMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!requesterMember) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await removeMember(teamId, memberId, context.user.id, requesterMember.role);
    return NextResponse.json({ success: true, message: 'Membre retiré avec succès' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la suppression du membre' },
      { status: 400 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getActiveTeamContext } from '@/lib/team-context';
import { revokeInvitation } from '@/services/team-service';
import { prisma } from '@/lib/prisma';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function DELETE(request, { params }) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const { teamId, invitationId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: context.user.id,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes pour révoquer une invitation.' },
        { status: 403 }
      );
    }

    await revokeInvitation(teamId, invitationId);
    return NextResponse.json({ success: true, message: 'Invitation révoquée avec succès' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la révocation de l’invitation' },
      { status: 400 }
    );
  }
}

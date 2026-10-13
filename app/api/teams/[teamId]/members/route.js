import { NextResponse } from 'next/server';
import { getActiveTeamContext } from '@/lib/team-context';
import { inviteMember } from '@/services/team-service';
import { prisma } from '@/lib/prisma';
import { verifyCsrfOrigin, createCsrfErrorResponse } from '@/lib/csrf-guard';

export async function GET(request, { params }) {
  try {
    const { teamId } = await params;
    const context = await getActiveTeamContext();
    if (context.status === 401) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify membership
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

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        teamId: member.teamId,
        role: member.role,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        user: member.user,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors du chargement des membres' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const csrfCheck = verifyCsrfOrigin(request);
  if (!csrfCheck.valid) {
    return createCsrfErrorResponse(csrfCheck.error);
  }

  try {
    const { teamId } = await params;
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
        { error: 'Permissions insuffisantes. Seuls les administrateurs ou propriétaires peuvent inviter.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    // Only OWNER can invite another ADMIN
    if (role === 'ADMIN' && membership.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Seul le propriétaire de l’équipe peut inviter un administrateur.' },
        { status: 403 }
      );
    }

    const origin = request.nextUrl.origin;
    const result = await inviteMember({
      teamId,
      invitedByUserId: context.user.id,
      email,
      role,
      appUrl: origin,
    });

    return NextResponse.json({ success: true, invitation: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l’envoi de l’invitation' },
      { status: 400 }
    );
  }
}

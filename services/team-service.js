import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendTeamInvitationEmail } from './notification-service.js';

/**
 * Normalizes email address
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Computes SHA-256 hash of a raw token
 */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Resolves the public base URL with priority to environment variables
 */
export function resolvePublicAppUrl(appUrl = null) {
  const envUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (appUrl && typeof appUrl === 'string' && appUrl.trim()) {
    return appUrl.trim().replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Builds the invitation acceptance URL with raw token
 */
export function buildInvitationAcceptUrl(rawToken, appUrl = null) {
  const baseUrl = resolvePublicAppUrl(appUrl);
  return `${baseUrl}/invitations/accept?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Retrieves all teams an user is a member of
 */
export async function getUserTeams(userId) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          _count: {
            select: {
              members: true,
              endpoints: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    role: m.role,
    membersCount: m.team._count.members,
    endpointsCount: m.team._count.endpoints,
    createdAt: m.team.createdAt,
    updatedAt: m.team.updatedAt,
  }));
}

/**
 * Retrieves detailed information about a team
 */
export async function getTeamDetails(teamId) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
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
      },
      invitations: {
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          createdAt: true,
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          endpoints: true,
        },
      },
    },
  });

  return team;
}

/**
 * Creates a new team and assigns the creator as OWNER in a single transaction
 */
export async function createTeam(name, userId) {
  if (!name || !name.trim()) {
    throw new Error("Le nom de l'équipe est obligatoire");
  }

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    throw new Error("Identifiant utilisateur requis pour créer une équipe");
  }

  const cleanUserId = userId.trim();

  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name: name.trim(),
      },
    });

    await tx.teamMember.create({
      data: {
        role: 'OWNER',
        teamId: team.id,
        userId: cleanUserId,
      },
    });

    return team;
  });
}

/**
 * Renames an existing team
 */
export async function updateTeam(teamId, { name }) {
  if (!name || !name.trim()) {
    throw new Error("Le nom de l'équipe ne peut pas être vide");
  }

  return await prisma.team.update({
    where: { id: teamId },
    data: { name: name.trim() },
  });
}

/**
 * Deletes a team safely: refuses deletion if endpoints are still attached
 */
export async function deleteTeam(teamId) {
  const endpointsCount = await prisma.apiEndpoint.count({
    where: { teamId },
  });

  if (endpointsCount > 0) {
    throw new Error(
      `Impossible de supprimer l'équipe car elle contient encore ${endpointsCount} monitor(s) actif(s). Supprimez ou transférez d'abord vos monitors.`
    );
  }

  return await prisma.team.delete({
    where: { id: teamId },
  });
}

/**
 * Atomically transfers ownership from current OWNER to another member
 */
export async function transferOwnership(teamId, currentOwnerUserId, targetUserId) {
  if (currentOwnerUserId === targetUserId) {
    throw new Error("Vous êtes déjà le propriétaire de cette équipe.");
  }

  const targetMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: targetUserId,
      },
    },
  });

  if (!targetMember) {
    throw new Error("L'utilisateur cible n'est pas membre de cette équipe.");
  }

  if (targetMember.role === 'OWNER') {
    throw new Error("L'utilisateur cible est déjà propriétaire.");
  }

  const currentMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: currentOwnerUserId,
      },
    },
  });

  if (!currentMember || currentMember.role !== 'OWNER') {
    throw new Error("Seul le propriétaire actuel peut transférer la propriété.");
  }

  return await prisma.$transaction(async (tx) => {
    // Demote current owner to ADMIN
    await tx.teamMember.update({
      where: { id: currentMember.id },
      data: { role: 'ADMIN' },
    });

    // Promote target member to OWNER
    const updatedTarget = await tx.teamMember.update({
      where: { id: targetMember.id },
      data: { role: 'OWNER' },
    });

    return updatedTarget;
  });
}

/**
 * Invites a collaborator by email with secure SHA-256 token hashing
 */
export async function inviteMember({ teamId, invitedByUserId, email, role, appUrl }) {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    throw new Error("L'adresse email est requise.");
  }

  const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
  if (!validRoles.includes(role)) {
    throw new Error(`Rôle invalide : ${role}`);
  }

  // 1. Fetch inviter info
  const inviter = await prisma.user.findUnique({
    where: { id: invitedByUserId },
  });

  if (!inviter) {
    throw new Error("Utilisateur invitant introuvable.");
  }

  // 2. Prevent self-invitation
  if (normalizeEmail(inviter.email) === cleanEmail) {
    throw new Error("Vous ne pouvez pas inviter votre propre adresse email.");
  }

  // 3. Fetch team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!team) {
    throw new Error("Équipe introuvable.");
  }

  // 4. Check if already member
  const alreadyMember = team.members.some(
    (m) => normalizeEmail(m.user.email) === cleanEmail
  );
  if (alreadyMember) {
    throw new Error("Cet utilisateur fait déjà partie de l'équipe.");
  }

  // 5. Generate secure rawToken and SHA-256 tokenHash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // 6. Delete any existing pending invitation for this email in this team and create new
  await prisma.$transaction(async (tx) => {
    await tx.teamInvitation.deleteMany({
      where: {
        teamId,
        email: cleanEmail,
      },
    });

    await tx.teamInvitation.create({
      data: {
        email: cleanEmail,
        role,
        tokenHash,
        expiresAt,
        teamId,
        invitedById: invitedByUserId,
      },
    });
  });

  // 7. Send invitation email
  const inviteLink = buildInvitationAcceptUrl(rawToken, appUrl);

  await sendTeamInvitationEmail({
    to: cleanEmail,
    teamName: team.name,
    inviterName: inviter.name,
    inviteLink,
    role,
  });

  return {
    success: true,
    email: cleanEmail,
    role,
    expiresAt,
  };
}

/**
 * Looks up invitation details by raw token (for the accept invitation UI)
 */
export async function getInvitationByRawToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error("Token d'invitation manquant ou invalide.");
  }

  const tokenHash = hashToken(rawToken.trim());
  const invitation = await prisma.teamInvitation.findUnique({
    where: { tokenHash },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, error: "Cette invitation n'existe pas ou a été révoquée." };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, error: "Cette invitation a expiré." };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      team: invitation.team,
      invitedBy: invitation.invitedBy,
    },
  };
}

/**
 * Accepts an invitation for an existing logged-in user
 */
export async function acceptInvitation(rawToken, userId) {
  if (!rawToken || !userId) {
    throw new Error("Paramètres invalides.");
  }

  const tokenHash = hashToken(rawToken.trim());
  const invitation = await prisma.teamInvitation.findUnique({
    where: { tokenHash },
    include: { team: true },
  });

  if (!invitation) {
    throw new Error("Invitation introuvable ou déjà utilisée.");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Cette invitation a expiré.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  // Check if already member
  const existingMembership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: invitation.teamId,
        userId: user.id,
      },
    },
  });

  return await prisma.$transaction(async (tx) => {
    let member = existingMembership;
    if (!member) {
      member = await tx.teamMember.create({
        data: {
          role: invitation.role,
          teamId: invitation.teamId,
          userId: user.id,
        },
      });
    }

    // Delete the consumed invitation
    await tx.teamInvitation.delete({
      where: { id: invitation.id },
    });

    return {
      success: true,
      teamId: invitation.teamId,
      teamName: invitation.team.name,
      role: member.role,
    };
  });
}

/**
 * Updates a member's role
 */
export async function updateMemberRole(teamId, memberId, newRole, requesterRole) {
  const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Rôle cible invalide : ${newRole}`);
  }

  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.teamId !== teamId) {
    throw new Error("Membre introuvable dans cette équipe.");
  }

  if (member.role === 'OWNER') {
    throw new Error("Impossible de modifier directement le rôle du propriétaire. Utilisez le transfert de propriété.");
  }

  // ADMIN can only change MEMBER <-> VIEWER
  if (requesterRole === 'ADMIN') {
    if (member.role === 'ADMIN' || newRole === 'ADMIN') {
      throw new Error("Seul le propriétaire peut promouvoir ou rétrograder des administrateurs.");
    }
  }

  return await prisma.teamMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });
}

/**
 * Removes a member or allows a member to leave
 */
export async function removeMember(teamId, memberId, requesterUserId, requesterRole) {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.teamId !== teamId) {
    throw new Error("Membre introuvable dans cette équipe.");
  }

  const isSelf = member.userId === requesterUserId;

  if (!isSelf) {
    if (requesterRole === 'ADMIN' && (member.role === 'OWNER' || member.role === 'ADMIN')) {
      throw new Error("Un administrateur ne peut pas expulser le propriétaire ou un autre administrateur.");
    }
    if (requesterRole !== 'OWNER' && requesterRole !== 'ADMIN') {
      throw new Error("Permissions insuffisantes pour expulser un membre.");
    }
    if (requesterRole === 'OWNER' && member.role === 'OWNER') {
      throw new Error("Impossible d'expulser un propriétaire sans transfert préalable de propriété.");
    }
  } else {
    if (member.role === 'OWNER') {
      const ownerCount = await prisma.teamMember.count({
        where: { teamId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new Error("Le propriétaire ne peut pas quitter l'équipe sans avoir transféré la propriété ou supprimé l'équipe.");
      }
    }
  }

  return await prisma.teamMember.delete({
    where: { id: memberId },
  });
}

/**
 * Revokes a pending invitation
 */
export async function revokeInvitation(teamId, invitationId) {
  const invitation = await prisma.teamInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.teamId !== teamId) {
    throw new Error("Invitation introuvable dans cette équipe.");
  }

  return await prisma.teamInvitation.delete({
    where: { id: invitationId },
  });
}

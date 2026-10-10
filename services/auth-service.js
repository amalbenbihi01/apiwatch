import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashToken } from './team-service.js';

// Pre-computed constant dummy hash to mitigate user enumeration timing attacks
const DUMMY_BCRYPT_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom est trop long'),
  email: z.string().email('Adresse email invalide').max(255, 'L’adresse email est trop longue'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères'),
  confirmPassword: z.string().max(128),
  invitationToken: z.string().optional().nullable(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide').max(255),
  password: z.string().min(1, 'Le mot de passe est requis').max(128),
});

export async function registerUser(data) {
  const validation = registerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const { name, email, password, invitationToken } = validation.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('Un compte existe déjà avec cette adresse email');
  }

  let pendingInvitation = null;
  if (invitationToken && invitationToken.trim().length > 0) {
    const tokenHash = hashToken(invitationToken.trim());
    pendingInvitation = await prisma.teamInvitation.findUnique({
      where: { tokenHash },
    });

    if (!pendingInvitation) {
      throw new Error("L'invitation spécifiée est introuvable ou a été révoquée");
    }

    if (new Date() > pendingInvitation.expiresAt) {
      throw new Error("L'invitation a expiré");
    }

    if (pendingInvitation.email.toLowerCase().trim() !== normalizedEmail) {
      throw new Error("L'adresse email ne correspond pas à celle de l'invitation reçue");
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Atomic transaction: create user + personal team + owner membership + optional invited team membership + delete invitation
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create user
    const newUser = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 2. Create personal team
    const personalTeam = await tx.team.create({
      data: {
        name: `Équipe de ${name}`,
      },
    });

    // 3. Link user as OWNER of personal team
    await tx.teamMember.create({
      data: {
        role: 'OWNER',
        teamId: personalTeam.id,
        userId: newUser.id,
      },
    });

    // 4. If registering via an invitation, link to invited team and delete invitation
    let activeTeamId = personalTeam.id;
    if (pendingInvitation) {
      await tx.teamMember.create({
        data: {
          role: pendingInvitation.role,
          teamId: pendingInvitation.teamId,
          userId: newUser.id,
        },
      });

      await tx.teamInvitation.delete({
        where: { id: pendingInvitation.id },
      });

      activeTeamId = pendingInvitation.teamId;
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      activeTeamId,
    };
  });

  return result;
}

export async function loginUser(data) {
  const validation = loginSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const { email, password } = validation.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Execute dummy bcrypt compare to prevent timing-based user enumeration
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    throw new Error('Identifiants incorrects');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Identifiants incorrects');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function getUserById(userId) {
  if (!userId) return null;

  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export async function registerUser(data) {
  const validation = registerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const { name, email, password } = validation.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new Error('Un compte existe déjà avec cette adresse email');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
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

  return user;
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

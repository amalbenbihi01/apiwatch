import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const urlSchema = z
  .string()
  .min(1, "L'URL de l'API est requise")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch (_) {
        return false;
      }
    },
    {
      message: "L'URL doit commencer par http:// ou https://",
    }
  );

const apiEndpointSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  url: urlSchema,
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], {
      errorMap: () => ({ message: 'Méthode HTTP invalide' }),
    })
    .default('GET'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateApiEndpointSchema = apiEndpointSchema.partial();

export async function createApiEndpoint(userId, data) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const validation = apiEndpointSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const { name, url, method, description, isActive } = validation.data;

  return await prisma.apiEndpoint.create({
    data: {
      name,
      url,
      method,
      description: description || null,
      isActive,
      userId,
    },
  });
}

export async function getUserApiEndpoints(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  return await prisma.apiEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getApiEndpointById(userId, endpointId) {
  if (!userId || !endpointId) throw new Error('Paramètres manquants');

  const endpoint = await prisma.apiEndpoint.findFirst({
    where: {
      id: endpointId,
      userId,
    },
  });

  if (!endpoint) {
    throw new Error('API non trouvée ou accès refusé');
  }

  return endpoint;
}

export async function updateApiEndpoint(userId, endpointId, data) {
  if (!userId || !endpointId) throw new Error('Paramètres manquants');

  // Verify ownership first
  await getApiEndpointById(userId, endpointId);

  const validation = updateApiEndpointSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  return await prisma.apiEndpoint.update({
    where: { id: endpointId },
    data: validation.data,
  });
}

export async function deleteApiEndpoint(userId, endpointId) {
  if (!userId || !endpointId) throw new Error('Paramètres manquants');

  // Verify ownership first
  await getApiEndpointById(userId, endpointId);

  return await prisma.apiEndpoint.delete({
    where: { id: endpointId },
  });
}

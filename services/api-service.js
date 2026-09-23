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

const emailSchema = z.string().email('Adresse email invalide');

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

  // Request Configuration
  headersJson: z.record(z.string(), z.string()).optional().nullable(),
  queryParamsJson: z.record(z.string(), z.string()).optional().nullable(),
  bodyJson: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        try {
          JSON.parse(val);
          return true;
        } catch (_) {
          return false;
        }
      },
      { message: 'Le corps de la requête doit être un JSON valide' }
    ),

  // Alert Configuration
  timeoutMs: z
    .number({ invalid_type_error: 'Le timeout doit être un nombre' })
    .min(500, 'Le timeout minimal est de 500 ms')
    .max(30000, 'Le timeout maximal est de 30000 ms')
    .default(5000),
  responseTimeThresholdMs: z
    .number({ invalid_type_error: 'Le seuil de temps de réponse doit être un nombre' })
    .min(50, 'Le seuil minimal de temps de réponse est de 50 ms')
    .max(30000, 'Le seuil maximal de temps de réponse est de 30000 ms')
    .optional()
    .nullable(),
  unhealthyThreshold: z
    .number()
    .min(1, 'Le nombre d’échecs minimal est de 1')
    .max(10, 'Le nombre d’échecs maximal est de 10')
    .default(1),
  recoveryThreshold: z
    .number()
    .min(1, 'Le nombre de succès minimal est de 1')
    .max(10, 'Le nombre de succès maximal est de 10')
    .default(1),

  // Multi-email recipients
  alertEmails: z.array(emailSchema).optional().nullable(),

  // Webhook configuration
  webhookUrl: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        try {
          const parsed = new URL(val.trim());
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_) {
          return false;
        }
      },
      { message: "L'URL du webhook doit commencer par http:// ou https://" }
    ),
  webhookSecret: z.string().optional().nullable(),
  clearWebhookSecret: z.boolean().optional(),
});

const updateApiEndpointSchema = apiEndpointSchema.partial();

export async function createApiEndpoint(userId, data) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const validation = apiEndpointSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const validatedData = validation.data;

  return await prisma.apiEndpoint.create({
    data: {
      name: validatedData.name,
      url: validatedData.url,
      method: validatedData.method,
      description: validatedData.description || null,
      isActive: validatedData.isActive,
      headersJson: validatedData.headersJson || null,
      queryParamsJson: validatedData.queryParamsJson || null,
      bodyJson: validatedData.bodyJson || null,
      timeoutMs: validatedData.timeoutMs ?? 5000,
      responseTimeThresholdMs: validatedData.responseTimeThresholdMs || null,
      unhealthyThreshold: validatedData.unhealthyThreshold ?? 1,
      recoveryThreshold: validatedData.recoveryThreshold ?? 1,
      alertEmails: validatedData.alertEmails || null,
      webhookUrl: validatedData.webhookUrl ? validatedData.webhookUrl.trim() : null,
      webhookSecret: validatedData.webhookSecret ? validatedData.webhookSecret.trim() : null,
      userId,
    },
  });
}

export async function getUserApiEndpoints(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const endpoints = await prisma.apiEndpoint.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return endpoints.map((ep) => sanitizeEndpointForClient(ep));
}

export async function getApiEndpointById(userId, endpointId, { raw = false } = {}) {
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

  return raw ? endpoint : sanitizeEndpointForClient(endpoint);
}

export async function updateApiEndpoint(userId, endpointId, data) {
  if (!userId || !endpointId) throw new Error('Paramètres manquants');

  // Verify ownership and get existing data
  const existing = await prisma.apiEndpoint.findFirst({
    where: { id: endpointId, userId },
  });

  if (!existing) {
    throw new Error('API non trouvée ou accès refusé');
  }

  const validation = updateApiEndpointSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Données invalides';
    throw new Error(firstError);
  }

  const validated = validation.data;
  const updateData = { ...validated };
  delete updateData.clearWebhookSecret;

  // Handle webhookSecret update lifecycle securely
  if (validated.clearWebhookSecret === true || data.webhookSecret === null) {
    updateData.webhookSecret = null;
  } else if (
    typeof validated.webhookSecret === 'string' &&
    validated.webhookSecret.trim().length > 0
  ) {
    updateData.webhookSecret = validated.webhookSecret.trim();
  } else {
    // Left empty or undefined: preserve existing secret
    delete updateData.webhookSecret;
  }

  if (validated.webhookUrl !== undefined) {
    updateData.webhookUrl = validated.webhookUrl ? validated.webhookUrl.trim() : null;
  }

  const updated = await prisma.apiEndpoint.update({
    where: { id: endpointId },
    data: updateData,
  });

  return sanitizeEndpointForClient(updated);
}

export async function deleteApiEndpoint(userId, endpointId) {
  if (!userId || !endpointId) throw new Error('Paramètres manquants');

  // Verify ownership first
  await getApiEndpointById(userId, endpointId, { raw: true });

  return await prisma.apiEndpoint.delete({
    where: { id: endpointId },
  });
}

/**
 * Sanitizes endpoint record for safe client transmission (never exposes raw webhookSecret).
 */
export function sanitizeEndpointForClient(endpoint) {
  if (!endpoint) return null;
  const isConfigured = Boolean(endpoint.webhookSecret && endpoint.webhookSecret.trim().length > 0);
  const copy = { ...endpoint };
  delete copy.webhookSecret;
  copy.webhookSecretConfigured = isConfigured;
  return copy;
}

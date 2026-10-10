import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

export const WIDGET_IDS = [
  'overview',
  'api-status',
  'uptime',
  'response-time',
  'incidents',
  'activity',
  'health-summary',
];

export const VALID_SIZES = ['small', 'medium', 'large'];

export const DEFAULT_DASHBOARD_CONFIG = {
  widgets: [
    { id: 'overview', visible: true, size: 'large', order: 0 },
    { id: 'api-status', visible: true, size: 'medium', order: 1 },
    { id: 'uptime', visible: true, size: 'small', order: 2 },
    { id: 'response-time', visible: true, size: 'large', order: 3 },
    { id: 'incidents', visible: true, size: 'medium', order: 4 },
    { id: 'activity', visible: true, size: 'small', order: 5 },
    { id: 'health-summary', visible: true, size: 'small', order: 6 },
  ],
};

const widgetItemSchema = z.object({
  id: z.enum(WIDGET_IDS, {
    errorMap: () => ({ message: 'Identifiant de widget non autorisé' }),
  }),
  visible: z.boolean({ invalid_type_error: 'La visibilité doit être un booléen' }),
  size: z.enum(VALID_SIZES, {
    errorMap: () => ({ message: 'Taille invalide. Les tailles acceptées sont small, medium, large' }),
  }),
  order: z.number({ invalid_type_error: 'L’ordre doit être un nombre' }).int().min(0),
});

export const dashboardConfigSchema = z.object({
  widgets: z
    .array(widgetItemSchema, {
      invalid_type_error: 'La liste des widgets est invalide',
    })
    .min(1, 'Au moins un widget doit être configuré')
    .refine(
      (widgets) => {
        const ids = widgets.map((w) => w.id);
        return new Set(ids).size === ids.length;
      },
      { message: 'Les identifiants de widgets doivent être uniques' }
    ),
});

/**
 * Normalizes a stored or raw config by ensuring all official widgets exist and are ordered
 */
export function normalizeDashboardConfig(rawConfig) {
  if (!rawConfig || !Array.isArray(rawConfig.widgets)) {
    return JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));
  }

  const existingWidgetsMap = new Map();
  rawConfig.widgets.forEach((w) => {
    if (WIDGET_IDS.includes(w.id)) {
      existingWidgetsMap.set(w.id, {
        id: w.id,
        visible: typeof w.visible === 'boolean' ? w.visible : true,
        size: VALID_SIZES.includes(w.size) ? w.size : 'medium',
        order: typeof w.order === 'number' && Number.isInteger(w.order) ? w.order : 0,
      });
    }
  });

  // Add any missing default widgets that weren't in the saved config
  DEFAULT_DASHBOARD_CONFIG.widgets.forEach((defaultW) => {
    if (!existingWidgetsMap.has(defaultW.id)) {
      existingWidgetsMap.set(defaultW.id, {
        ...defaultW,
        order: existingWidgetsMap.size,
      });
    }
  });

  const sortedWidgets = Array.from(existingWidgetsMap.values()).sort(
    (a, b) => a.order - b.order
  );

  // Normalize order indices sequentially (0, 1, 2, ...)
  return {
    widgets: sortedWidgets.map((w, index) => ({
      ...w,
      order: index,
    })),
  };
}

/**
 * Retrieves dashboard preferences for a specific (userId, teamId) pair.
 * Returns default config if none is stored.
 */
export async function getUserDashboardPreferences(userId, teamId) {
  if (!userId || !teamId) {
    throw new Error('Contexte utilisateur ou équipe manquant');
  }

  const preference = await prisma.dashboardPreference.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });

  if (!preference || !preference.config) {
    return {
      isCustom: false,
      config: JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_CONFIG)),
    };
  }

  return {
    isCustom: true,
    config: normalizeDashboardConfig(preference.config),
    updatedAt: preference.updatedAt,
  };
}

/**
 * Updates or creates dashboard preferences for a specific (userId, teamId) pair.
 */
export async function updateUserDashboardPreferences(userId, teamId, configData) {
  if (!userId || !teamId) {
    throw new Error('Contexte utilisateur ou équipe manquant');
  }

  const validation = dashboardConfigSchema.safeParse(configData);
  if (!validation.success) {
    const firstError = validation.error.issues[0]?.message || 'Configuration de tableau de bord invalide';
    throw new Error(firstError);
  }

  const normalized = normalizeDashboardConfig(validation.data);

  const preference = await prisma.dashboardPreference.upsert({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    update: {
      config: normalized,
    },
    create: {
      userId,
      teamId,
      config: normalized,
    },
  });

  return {
    isCustom: true,
    config: preference.config,
    updatedAt: preference.updatedAt,
  };
}

/**
 * Resets dashboard preferences for a specific (userId, teamId) pair.
 */
export async function resetUserDashboardPreferences(userId, teamId) {
  if (!userId || !teamId) {
    throw new Error('Contexte utilisateur ou équipe manquant');
  }

  await prisma.dashboardPreference.deleteMany({
    where: {
      userId,
      teamId,
    },
  });

  return {
    isCustom: false,
    config: JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_CONFIG)),
    message: 'Configuration réinitialisée aux valeurs par défaut',
  };
}

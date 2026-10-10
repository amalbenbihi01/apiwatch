/**
 * Production Environment Configuration & Secret Validator
 * Fails fast if critical secrets are missing or set to default fallback values in production.
 * NEVER prints secret values to console/logs.
 */

export function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const jwtSecret = process.env.JWT_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const databaseUrl = process.env.DATABASE_URL;

  // 1. Check DATABASE_URL
  if (!databaseUrl || databaseUrl.trim() === '') {
    errors.push('DATABASE_URL est manquant ou vide.');
  }

  // 2. Check JWT_SECRET
  if (!jwtSecret || jwtSecret.trim() === '') {
    if (isProd) {
      errors.push('JWT_SECRET est obligatoire en production.');
    } else {
      warnings.push('JWT_SECRET non défini, utilisation de la clé par défaut en mode développement.');
    }
  } else if (
    jwtSecret === 'fallback_secret_key_change_me_in_prod' ||
    jwtSecret === 'changez-ce-secret-en-production'
  ) {
    if (isProd) {
      errors.push('JWT_SECRET utilise une clé par défaut non sécurisée en production.');
    }
  }

  // 3. Check CRON_SECRET
  if (!cronSecret || cronSecret.trim() === '') {
    if (isProd) {
      errors.push('CRON_SECRET est obligatoire en production pour sécuriser les tâches planifiées.');
    } else {
      warnings.push('CRON_SECRET non configuré en mode développement.');
    }
  } else if (cronSecret === 'changez-ce-secret-en-production') {
    if (isProd) {
      errors.push('CRON_SECRET utilise la valeur d’exemple en production.');
    }
  }

  // Log warnings if any
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[Security Warning] ${w}`));
  }

  // Fail fast in production
  if (errors.length > 0 && isProd) {
    console.error('=============================================================');
    console.error('❌ ERREUR DE CONFIGURATION CRITIQUE AU DÉMARRAGE :');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('=============================================================');
    throw new Error(`Échec du démarrage de l’application en production : ${errors.join(' ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

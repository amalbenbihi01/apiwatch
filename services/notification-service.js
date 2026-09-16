import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

export async function sendIncidentNotification(incidentInput, type) {
  try {
    if (!incidentInput || !incidentInput.id || !type) {
      return null;
    }

    // Fetch full incident details including endpoint and user
    const incident = await prisma.incident.findUnique({
      where: { id: incidentInput.id },
      include: {
        endpoint: true,
        user: { select: { id: true, email: true, emailNotificationsEnabled: true } },
      },
    });

    if (!incident || !incident.user) {
      return null;
    }

    const { user, endpoint } = incident;

    // 1. Check User Notification Preferences
    if (!user.emailNotificationsEnabled) {
      console.log(`[Notification] Emails désactivés pour l'utilisateur ${user.id}.`);
      return null;
    }

    // 2. Anti-Duplicate Check in PostgreSQL
    const existingLog = await prisma.notificationLog.findUnique({
      where: {
        incidentId_type: {
          incidentId: incident.id,
          type,
        },
      },
    });

    if (existingLog) {
      console.log(`[Notification] Notification ${type} déjà envoyée pour l'incident ${incident.id}.`);
      return existingLog;
    }

    // 3. Build Subject & Content
    let subject = '';
    let message = '';

    if (type === 'INCIDENT_OPEN') {
      subject = `🚨 Alerte Panne : ${endpoint.name} est indisponible`;
      message = `L'endpoint API "${endpoint.name}" (${endpoint.url}) est actuellement indisponible. Cause détectée : ${incident.cause || 'Inaccessible'}. Incident ouvert le ${new Date(incident.startedAt).toLocaleString('fr-FR')}.`;
    } else if (type === 'INCIDENT_RESOLVED') {
      const durationMs = incident.resolvedAt
        ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()
        : 0;
      const durationMin = Math.max(1, Math.round(durationMs / 60000));
      subject = `✅ Rétablissement : ${endpoint.name} est de nouveau en ligne`;
      message = `L'endpoint API "${endpoint.name}" (${endpoint.url}) est de nouveau fonctionnel. Durée totale de la panne : ${durationMin} min. Incident résolu le ${new Date(incident.resolvedAt || Date.now()).toLocaleString('fr-FR')}.`;
    } else {
      return null;
    }

    // 4. Attempt Sending Email via Nodemailer
    let sendError = null;
    let isSent = false;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"APIWatch Alerting" <no-reply@apiwatch.io>',
        to: user.email,
        subject,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; rounded: 8px;">
          <h2 style="color: ${type === 'INCIDENT_OPEN' ? '#f43f5e' : '#10b981'};">${subject}</h2>
          <p style="font-size: 14px; line-height: 1.6;">${message}</p>
          <hr style="border-color: #334155; margin-top: 20px;" />
          <p style="font-size: 11px; color: #94a3b8;">Ce message automatique vous a été envoyé par APIWatch Monitoring.</p>
        </div>`,
      });

      isSent = true;
      console.log(`[Notification] Email ${type} envoyé avec succès à ${user.email}`);
    } catch (err) {
      isSent = false;
      sendError = (err.message || 'Erreur d’envoi SMTP inconnue').replace(/[\r\n]+/g, ' ').substring(0, 255);
      console.error(`[Notification Error] Échec d’envoi d'email à ${user.email}:`, sendError);
    }

    // 5. Log Result in PostgreSQL NotificationLog Table
    try {
      return await prisma.notificationLog.create({
        data: {
          type,
          channel: 'EMAIL',
          status: isSent ? 'SENT' : 'FAILED',
          recipient: user.email,
          subject,
          message,
          error: isSent ? null : sendError,
          sentAt: isSent ? new Date() : null, // Nullable: only filled if SENT
          incidentId: incident.id,
          userId: user.id,
        },
      });
    } catch (dbErr) {
      if (dbErr.code === 'P2002') {
        // Handle race conditions gracefully
        return await prisma.notificationLog.findUnique({
          where: { incidentId_type: { incidentId: incident.id, type } },
        });
      }
      console.error('[Notification DB Error] Échec d’enregistrement du log:', dbErr);
      return null;
    }
  } catch (topError) {
    // Total Fail-Safe Guard: Never throw up to caller
    console.error('[Notification Fatal Error] Erreur inattendue dans sendIncidentNotification:', topError);
    return null;
  }
}

export async function getUserNotificationLogs(userId, limit = 20) {
  if (!userId) throw new Error('Utilisateur non identifié');

  return await prisma.notificationLog.findMany({
    where: { userId },
    include: {
      incident: {
        include: {
          endpoint: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUserNotificationPreferences(userId) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailNotificationsEnabled: true },
  });

  return {
    emailNotificationsEnabled: user?.emailNotificationsEnabled ?? true,
  };
}

export async function updateUserNotificationPreferences(userId, { emailNotificationsEnabled }) {
  if (!userId) throw new Error('Utilisateur non identifié');

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      emailNotificationsEnabled: Boolean(emailNotificationsEnabled),
    },
    select: {
      emailNotificationsEnabled: true,
    },
  });

  return updatedUser;
}

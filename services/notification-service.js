import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma.js';

/**
 * Validates and deduplicates email addresses for incident alerts.
 * Always includes owner email if valid, plus any valid emails from alertEmails.
 */
function sanitizeAlertEmails(alertEmails, ownerEmail) {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails = new Set();

  if (ownerEmail && typeof ownerEmail === 'string' && EMAIL_REGEX.test(ownerEmail.trim())) {
    emails.add(ownerEmail.trim().toLowerCase());
  }

  if (Array.isArray(alertEmails)) {
    for (const email of alertEmails) {
      if (typeof email === 'string' && EMAIL_REGEX.test(email.trim())) {
        emails.add(email.trim().toLowerCase());
      }
    }
  }

  return Array.from(emails);
}

/**
 * Builds email subject, plain text message, and HTML markup.
 */
function buildEmailContent(incident, endpoint, type) {
  const formattedDate = new Date(incident.startedAt).toLocaleString('fr-FR', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  if (type === 'INCIDENT_OPEN') {
    const subject = `🚨 [APIWatch] Incident détecté — ${endpoint.name}`;
    const textMessage = `[APIWatch Monitoring] Incident Détecté\n\n` +
      `L'API "${endpoint.name}" est actuellement indisponible.\n` +
      `URL : ${endpoint.url}\n` +
      `Méthode : ${endpoint.method || 'GET'}\n` +
      `Statut : DOWN\n` +
      `Cause : ${incident.cause || 'Inaccessible / HTTP Error'}\n` +
      `Date de détection : ${formattedDate} (UTC)\n\n` +
      `Ce message automatique a été envoyé par la plateforme de surveillance APIWatch.`;

    const htmlContent = `
      <div style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          <div style="background-color: #ef4444; padding: 16px 24px; display: flex; align-items: center;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">🚨 Alerte Incident — ${endpoint.name}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #cbd5e1;">Une anomalie a été détectée sur votre service lors des contrôles automatiques APIWatch.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155; width: 35%;">Service / API</td>
                <td style="padding: 10px 12px; color: #f8fafc; font-weight: 600; border-bottom: 1px solid #334155;">${endpoint.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">URL surveillée</td>
                <td style="padding: 10px 12px; color: #38bdf8; word-break: break-all; border-bottom: 1px solid #334155;">${endpoint.url}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Méthode HTTP</td>
                <td style="padding: 10px 12px; color: #f8fafc; border-bottom: 1px solid #334155;"><span style="background-color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${endpoint.method || 'GET'}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Statut</td>
                <td style="padding: 10px 12px; color: #ef4444; font-weight: 700; border-bottom: 1px solid #334155;">DOWN</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Cause détectée</td>
                <td style="padding: 10px 12px; color: #fca5a5; border-bottom: 1px solid #334155;">${incident.cause || 'Service inaccessible'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8;">Détecté le</td>
                <td style="padding: 10px 12px; color: #f8fafc;">${formattedDate} (UTC)</td>
              </tr>
            </table>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 8px; border-left: 4px solid #ef4444; margin-top: 16px;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Le système continuera de surveiller cet endpoint et vous notifiera dès son rétablissement.</p>
            </div>
          </div>
          <div style="background-color: #0f172a; padding: 16px 24px; border-top: 1px solid #334155; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">Notification automatique générée par <strong>APIWatch Monitoring</strong>.</p>
          </div>
        </div>
      </div>
    `;

    return { subject, textMessage, htmlContent };
  } else if (type === 'INCIDENT_RESOLVED') {
    const durationMs = incident.resolvedAt
      ? new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime()
      : 0;
    const durationMin = Math.max(1, Math.round(durationMs / 60000));
    const resolvedDate = new Date(incident.resolvedAt || Date.now()).toLocaleString('fr-FR', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const subject = `✅ [APIWatch] API rétablie — ${endpoint.name}`;
    const textMessage = `[APIWatch Monitoring] API Rétablie\n\n` +
      `L'API "${endpoint.name}" est de nouveau opérationnelle.\n` +
      `URL : ${endpoint.url}\n` +
      `Statut : UP\n` +
      `Durée de l'interruption : ~${durationMin} min\n` +
      `Rétabli le : ${resolvedDate} (UTC)\n\n` +
      `Ce message automatique a été envoyé par la plateforme de surveillance APIWatch.`;

    const htmlContent = `
      <div style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          <div style="background-color: #10b981; padding: 16px 24px; display: flex; align-items: center;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">✅ Rétablissement du Service — ${endpoint.name}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #cbd5e1;">L'API a répondu avec succès lors du dernier cycle de surveillance et l'incident est désormais résolu.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155; width: 35%;">Service / API</td>
                <td style="padding: 10px 12px; color: #f8fafc; font-weight: 600; border-bottom: 1px solid #334155;">${endpoint.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">URL surveillée</td>
                <td style="padding: 10px 12px; color: #38bdf8; word-break: break-all; border-bottom: 1px solid #334155;">${endpoint.url}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Statut</td>
                <td style="padding: 10px 12px; color: #10b981; font-weight: 700; border-bottom: 1px solid #334155;">UP</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Durée de la panne</td>
                <td style="padding: 10px 12px; color: #6ee7b7; border-bottom: 1px solid #334155;">~${durationMin} minute(s)</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8;">Rétabli le</td>
                <td style="padding: 10px 12px; color: #f8fafc;">${resolvedDate} (UTC)</td>
              </tr>
            </table>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 16px;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Toutes les sondes sont à nouveau opérationnelles.</p>
            </div>
          </div>
          <div style="background-color: #0f172a; padding: 16px 24px; border-top: 1px solid #334155; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">Notification automatique générée par <strong>APIWatch Monitoring</strong>.</p>
          </div>
        </div>
      </div>
    `;

    return { subject, textMessage, htmlContent };
  }

  return null;
}

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

    if (!incident || !incident.user || !incident.endpoint) {
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

    // 3. Recipients compilation & deduplication (Owner + alertEmails)
    const recipients = sanitizeAlertEmails(endpoint.alertEmails, user.email);

    if (recipients.length === 0) {
      console.log(`[Notification] Aucun destinataire valide pour l'incident ${incident.id}.`);
      return null;
    }

    // 4. Build Subject & Content
    const emailContent = buildEmailContent(incident, endpoint, type);
    if (!emailContent) {
      return null;
    }

    const { subject, textMessage, htmlContent } = emailContent;

    // 5. Attempt Sending Email via Nodemailer (SMTP / Gmail)
    let sendError = null;
    let isSent = false;

    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const isSecure = port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port,
        secure: isSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"APIWatch Alerting" <no-reply@apiwatch.io>',
        to: recipients,
        subject,
        text: textMessage,
        html: htmlContent,
      });

      isSent = true;
      console.log(`[Notification] Email ${type} envoyé avec succès (messageId: ${info?.messageId || 'N/A'}) aux destinataires : ${recipients.join(', ')}`);
    } catch (err) {
      isSent = false;
      sendError = (err.message || 'Erreur d’envoi SMTP inconnue').replace(/[\r\n]+/g, ' ').substring(0, 255);
      console.error(`[Notification Error] Échec d’envoi d'email aux destinataires (${recipients.join(', ')}):`, sendError);
    }

    // 6. Log Result in PostgreSQL NotificationLog Table
    try {
      return await prisma.notificationLog.create({
        data: {
          type,
          channel: 'EMAIL',
          status: isSent ? 'SENT' : 'FAILED',
          recipient: recipients.join(', '),
          subject,
          message: textMessage,
          error: isSent ? null : sendError,
          sentAt: isSent ? new Date() : null,
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
    // Total Fail-Safe Guard: Never throw up to caller (monitoring must never crash)
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

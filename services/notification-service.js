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
 * Builds email subject, plain text message, and HTML markup for incidents.
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

    const subject = `✅ [APIWatch] Incident résolu — ${endpoint.name}`;
    const textMessage = `[APIWatch Monitoring] Incident Résolu\n\n` +
      `L'API "${endpoint.name}" est à nouveau opérationnelle et répond normalement aux contrôles.\n` +
      `URL : ${endpoint.url}\n` +
      `Statut : UP\n` +
      `Durée totale de l'incident : ~${durationMin} min\n` +
      `Date de résolution : ${resolvedDate} (UTC)\n\n` +
      `Ce message automatique a été envoyé par la plateforme de surveillance APIWatch.`;

    const htmlContent = `
      <div style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          <div style="background-color: #10b981; padding: 16px 24px; display: flex; align-items: center;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">✅ Incident Résolu — ${endpoint.name}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #cbd5e1;">Le service a été rétabli avec succès et les health checks sont à nouveau au vert.</p>
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
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Statut actuel</td>
                <td style="padding: 10px 12px; color: #10b981; font-weight: 700; border-bottom: 1px solid #334155;">UP / Opérationnel</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #334155;">Durée de coupure</td>
                <td style="padding: 10px 12px; color: #f8fafc; border-bottom: 1px solid #334155;">~${durationMin} min</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #94a3b8;">Résolu le</td>
                <td style="padding: 10px 12px; color: #f8fafc;">${resolvedDate} (UTC)</td>
              </tr>
            </table>
          </div>
          <div style="background-color: #0f172a; padding: 16px 24px; border-top: 1px solid #334155; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">Notification automatique générée par <strong>APIWatch Monitoring</strong>.</p>
          </div>
        </div>
      </div>
    `;

    return { subject, textMessage, htmlContent };
  }

  throw new Error(`Type de notification inconnu : ${type}`);
}

/**
 * Creates and returns configured Nodemailer transporter using Gmail SMTP.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
}

/**
 * Resolves clean from address header
 */
function getFromAddress(defaultName = 'APIWatch') {
  const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!rawFrom) return `"${defaultName}" <no-reply@apiwatch.dev>`;

  if (rawFrom.includes('<') && rawFrom.includes('>')) {
    return rawFrom;
  }

  return `"${defaultName}" <${rawFrom.trim()}>`;
}

/**
 * Sends team invitation email.
 */
export async function sendTeamInvitationEmail({ to, teamName, inviterName, inviteLink, role }) {
  try {
    const cleanTo = to ? to.trim().toLowerCase() : null;
    if (!cleanTo) {
      throw new Error("Adresse email destinataire manquante");
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('[Notification Service] SMTP non configuré (SMTP_USER/SMTP_PASS manquants). Email d\'invitation simulé.');
      return { success: true, simulated: true };
    }

    const fromAddress = getFromAddress('APIWatch Teams');
    const subject = `Invitation à rejoindre l'équipe ${teamName} sur APIWatch`;
    const textMessage = `Bonjour,\n\n${inviterName || 'Un administrateur'} vous a invité à rejoindre l'équipe "${teamName}" sur APIWatch avec le rôle ${role}.\n\nCliquez sur le lien suivant pour accepter l'invitation :\n${inviteLink}\n\nCe lien expirera dans 7 jours.`;

    const htmlContent = `
      <div style="margin: 0; padding: 24px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          <div style="background-color: #3b82f6; padding: 16px 24px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">Invitation d'Équipe — APIWatch</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #cbd5e1;"><strong>${inviterName || 'Un administrateur'}</strong> vous a invité à rejoindre l'équipe <strong>${teamName}</strong> sur APIWatch avec le rôle <span style="background-color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${role}</span>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Accepter l'invitation</a>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">Si le bouton ne fonctionne pas, copiez-collez l'adresse suivante dans votre navigateur :<br><span style="color: #38bdf8; word-break: break-all;">${inviteLink}</span></p>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Cette invitation expire dans 7 jours.</p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: cleanTo,
      subject,
      text: textMessage,
      html: htmlContent,
    });

    console.log(`[Notification Service] Email d'invitation envoyé à ${cleanTo} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Notification Service] Erreur lors de l\'envoi de l\'invitation:', error.message || error);
    return { success: false, error: error.message || 'Erreur SMTP inconnue' };
  }
}

/**
 * Handles sending incident notification email and logging it in NotificationLog table.
 */
export async function sendIncidentNotification(incident, endpoint, type) {
  try {
    if (!incident || !endpoint) {
      console.warn('[Notification Service] Incident ou endpoint manquant. Envoi annulé.');
      return null;
    }

    // 1. Check if user has enabled email notifications
    const user = await prisma.user.findUnique({
      where: { id: endpoint.userId },
      select: { id: true, email: true, emailNotificationsEnabled: true },
    });

    if (!user) {
      console.warn(`[Notification Service] Utilisateur propriétaire (${endpoint.userId}) introuvable.`);
      return null;
    }

    // 2. Anti-Spam / Anti-Doublon check
    const existingLog = await prisma.notificationLog.findUnique({
      where: {
        incidentId_type: {
          incidentId: incident.id,
          type,
        },
      },
    });

    if (existingLog && existingLog.status === 'SENT') {
      console.log(`[Notification Service] Notification ${type} déjà envoyée avec succès pour l'incident ${incident.id}.`);
      return existingLog;
    }

    // 3. Collect and sanitize recipient email addresses
    const userOwnerEmail = user.emailNotificationsEnabled ? user.email : null;
    const recipients = sanitizeAlertEmails(endpoint.alertEmails, userOwnerEmail);

    if (recipients.length === 0) {
      console.log(`[Notification Service] Aucun destinataire d'alerte configuré pour l'endpoint ${endpoint.name}.`);
      return null;
    }

    // 4. Build Content
    const { subject, textMessage, htmlContent } = buildEmailContent(incident, endpoint, type);

    // 5. Send Email via Transporter
    const transporter = createTransporter();
    let isSent = false;
    let sendError = null;

    if (!transporter) {
      sendError = 'Configuration SMTP absente ou incomplète (SMTP_USER/SMTP_PASS)';
      console.warn('[Notification Service] SMTP non configuré:', sendError);
    } else {
      try {
        const fromAddress = getFromAddress('APIWatch Monitoring');
        await transporter.sendMail({
          from: fromAddress,
          to: recipients.join(', '),
          subject,
          text: textMessage,
          html: htmlContent,
        });
        isSent = true;
      } catch (err) {
        sendError = err.message || 'Erreur SMTP inconnue';
        console.error(`[Notification Error] Échec d’envoi d'email aux destinataires (${recipients.join(', ')}):`, sendError);
      }
    }

    // 6. Log Result in NotificationLog Table
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
        return await prisma.notificationLog.findUnique({
          where: { incidentId_type: { incidentId: incident.id, type } },
        });
      }
      console.error('[Notification DB Error] Échec d’enregistrement du log:', dbErr);
      return null;
    }
  } catch (topError) {
    console.error('[Notification Fatal Error] Erreur inattendue dans sendIncidentNotification:', topError);
    return null;
  }
}

export async function getTeamNotificationLogs(teamId, limit = 20) {
  if (!teamId) throw new Error('Équipe non identifiée');

  return await prisma.notificationLog.findMany({
    where: {
      incident: {
        endpoint: {
          teamId,
        },
      },
    },
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

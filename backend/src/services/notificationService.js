const pool = require('../config/database');

// Map event_type to the user preference column
const EVENT_PREF_MAP = {
  ticket_assigned:  'notify_ticket_assigned',
  ticket_created:   'notify_ticket_created',
  status_changed:   'notify_status_changed',
  sla_approaching:  'notify_sla_warning',
  sla_overdue:      'notify_sla_warning',
  unmatched_email:  'notify_unmatched_email',
  high_priority:    'notify_high_priority',
};

/**
 * Send an email notification to a user if they have an email and the preference enabled.
 */
async function sendEmailNotification(userId, eventType, title, message) {
  try {
    const prefCol = EVENT_PREF_MAP[eventType];
    if (!prefCol) return;

    const result = await pool.query(
      `SELECT email, ${prefCol} AS pref FROM users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    const user = result.rows[0];
    if (!user?.email || !user.pref) return;

    // Lazy-require to avoid circular dependency
    const nodemailer = require('nodemailer');
    const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
    const smtpPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    if (!smtpUser || !smtpPass) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: user.email,
      subject: `[ServiceTool] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h3 style="color: #1e293b; margin-bottom: 8px;">${title}</h3>
          ${message ? `<p style="color: #475569;">${message}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Diese Benachrichtigung wurde vom ServiceTool gesendet.
            Sie können Ihre Einstellungen in der Benutzerverwaltung anpassen.
          </p>
        </div>
      `
    });
  } catch (err) {
    // Email failures should never block the main flow
    console.error('[Notification] Email-Versand Fehler:', err.message);
  }
}

/**
 * Create a notification for a single user + optionally send email.
 */
async function createNotification({ userId, eventType, title, message, referenceType, referenceId }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, event_type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, title, message || null, referenceType || null, referenceId || null]
    );

    // Send email notification (non-blocking)
    sendEmailNotification(userId, eventType, title, message).catch(() => {});
  } catch (err) {
    console.error('[Notification] Fehler:', err.message);
  }
}

/**
 * Notify all active users with a given role name.
 */
async function notifyUsersByRole(roleName, { eventType, title, message, referenceType, referenceId }) {
  try {
    const result = await pool.query(
      `SELECT u.user_id FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.name = $1 AND u.is_active = true`,
      [roleName]
    );
    for (const row of result.rows) {
      await createNotification({ userId: row.user_id, eventType, title, message, referenceType, referenceId });
    }
  } catch (err) {
    console.error('[Notification] notifyUsersByRole Fehler:', err.message);
  }
}

/**
 * Notify the assigned user of a ticket (if any).
 * Optionally exclude a user (e.g. the one who made the change).
 */
async function notifyAssignee(ticketnr, { eventType, title, message, excludeUserId }) {
  try {
    const result = await pool.query('SELECT assigned_to FROM ticket WHERE ticketnr = $1', [ticketnr]);
    const assignedTo = result.rows[0]?.assigned_to;
    if (assignedTo && assignedTo !== excludeUserId) {
      await createNotification({
        userId: assignedTo,
        eventType,
        title,
        message,
        referenceType: 'ticket',
        referenceId: ticketnr
      });
    }
  } catch (err) {
    console.error('[Notification] notifyAssignee Fehler:', err.message);
  }
}

/**
 * Notify about high-priority ticket creation.
 * Sends to all admins + assigned user.
 */
async function notifyHighPriority(ticketnr, title, message, assignedTo) {
  try {
    const admins = await pool.query(
      `SELECT u.user_id FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.name = 'admin' AND u.is_active = true`
    );
    const targets = new Set(admins.rows.map(a => a.user_id));
    if (assignedTo) targets.add(assignedTo);

    for (const userId of targets) {
      await createNotification({
        userId,
        eventType: 'high_priority',
        title,
        message,
        referenceType: 'ticket',
        referenceId: ticketnr
      });
    }
  } catch (err) {
    console.error('[Notification] notifyHighPriority Fehler:', err.message);
  }
}

/**
 * Check SLA status for open tickets and notify on approaching/overdue.
 * Uses 24h dedup window to avoid repeated notifications.
 */
async function checkSlaNotifications() {
  try {
    const result = await pool.query(
      `SELECT t.ticketnr, t.assigned_to, sp.response_time_h, t.erstellt_am,
              EXTRACT(EPOCH FROM (NOW() - t.erstellt_am)) / 3600 AS elapsed_h
       FROM ticket t
       JOIN status s ON t.status_id = s.status_id
       JOIN kunden k ON t.ticket_kundennummer = k.kundennummer
       JOIN service_priority sp ON k.service_priority_id = sp.service_priority_id
       WHERE s.is_terminal = false
         AND sp.response_time_h IS NOT NULL`
    );

    for (const row of result.rows) {
      const { ticketnr, assigned_to, response_time_h, elapsed_h } = row;
      let eventType = null;
      let title = null;

      if (elapsed_h >= response_time_h) {
        eventType = 'sla_overdue';
        title = `SLA überschritten: Ticket #${ticketnr}`;
      } else if (elapsed_h >= response_time_h * 0.8) {
        eventType = 'sla_approaching';
        title = `SLA läuft ab: Ticket #${ticketnr}`;
      }

      if (!eventType) continue;

      // Collect target users: assignee + all admins
      const targetUsers = new Set();
      if (assigned_to) targetUsers.add(assigned_to);

      const admins = await pool.query(
        `SELECT u.user_id FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.name = 'admin' AND u.is_active = true`
      );
      for (const a of admins.rows) targetUsers.add(a.user_id);

      const remaining = Math.max(0, response_time_h - elapsed_h).toFixed(1);
      const message = eventType === 'sla_overdue'
        ? `SLA um ${(elapsed_h - response_time_h).toFixed(1)}h überschritten`
        : `Noch ${remaining}h verbleibend`;

      for (const userId of targetUsers) {
        // 24h dedup
        const exists = await pool.query(
          `SELECT 1 FROM notifications
           WHERE user_id = $1 AND event_type = $2 AND reference_id = $3
             AND created_at > NOW() - INTERVAL '24 hours'
           LIMIT 1`,
          [userId, eventType, ticketnr]
        );
        if (exists.rows.length === 0) {
          await createNotification({
            userId, eventType, title, message,
            referenceType: 'ticket', referenceId: ticketnr
          });
        }
      }
    }
  } catch (err) {
    console.error('[Notification] checkSlaNotifications Fehler:', err.message);
  }
}

/**
 * Cleanup old read notifications (older than 30 days).
 */
async function cleanupOldNotifications() {
  try {
    await pool.query("DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days'");
  } catch (err) {
    console.error('[Notification] cleanup Fehler:', err.message);
  }
}

module.exports = {
  createNotification,
  notifyUsersByRole,
  notifyAssignee,
  notifyHighPriority,
  checkSlaNotifications,
  cleanupOldNotifications
};

require('dotenv').config();

// Sentry (optional – nur wenn SENTRY_DSN gesetzt)
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  });
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');

// Startup-Validierung: kritische Env-Vars prüfen
const required = ['DB_PASSWORD', 'SESSION_SECRET'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL: Umgebungsvariable ${key} nicht gesetzt`);
    process.exit(1);
  }
});

const ticketsRouter = require('./routes/tickets');
const kundenRouter = require('./routes/kunden');
const lookupRouter = require('./routes/lookup');
const ersatzteileRouter = require('./routes/ersatzteile');
const maschinentypenRouter = require('./routes/maschinentypen');
const maschinenRouter = require('./routes/maschinen');
const stammdatenRouter = require('./routes/stammdaten');
const systemRouter = require('./routes/system');
const customFieldsAdminRouter = require('./routes/customFieldsAdmin');
const ansprechpartnerRouter = require('./routes/ansprechpartner');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const importRouter = require('./routes/import');
const notificationsRouter = require('./routes/notifications');
const aiRouter = require('./routes/ai');
const rolesRouter = require('./routes/roles');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { maintenanceModeMiddleware } = require('./middleware/maintenanceMode');
const { startEmailPolling } = require('./services/emailService');
const { checkSlaNotifications, cleanupOldNotifications } = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 3001;

// HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Frontend liegt nicht hier
}));

// CORS aus .env
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Payload-Limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Globales Rate-Limit für alle API-Routen
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte später erneut versuchen' }
});
app.use('/api', globalLimiter);

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Öffentlicher Wartungsmodus-Status (kein Auth nötig, z.B. für Login-Seite)
app.get('/api/system/maintenance', async (req, res) => {
  const pool = require('./config/database');
  try {
    const result = await pool.query(
      'SELECT is_active, activated_by, activated_at, reason, estimated_end FROM maintenance_mode WHERE id = 1'
    );
    res.json(result.rows[0] || { is_active: false });
  } catch (err) {
    res.json({ is_active: false });
  }
});

// Protect all remaining /api routes
app.use('/api', requireAuth);

// Wartungsmodus-Middleware (nach Auth, damit Admins immer durchkommen)
app.use('/api', maintenanceModeMiddleware);

// Routes
app.use('/api/tickets', ticketsRouter);
app.use('/api/kunden', kundenRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/ersatzteile', ersatzteileRouter);
app.use('/api/maschinentypen', maschinentypenRouter);
app.use('/api/maschinen', maschinenRouter);
app.use('/api/stammdaten', requireAdmin, stammdatenRouter);
app.use('/api/system', requireAdmin, systemRouter);
app.use('/api/custom-fields', requireAdmin, customFieldsAdminRouter);
app.use('/api/ansprechpartner', ansprechpartnerRouter);
app.use('/api/users', requireAdmin, usersRouter);
app.use('/api/import', importRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/roles', rolesRouter);

// Sentry Error-Handler (muss vor eigenem Error-Handler stehen)
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

// Error Handler – keine Stack-Traces in Produktion
app.use((err, req, res, next) => {
  console.error(err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: isProd ? 'Interner Serverfehler' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Service Tool Backend läuft auf Port ${PORT}`);
  startEmailPolling();

  // SLA-Notifications alle 5 Minuten prüfen + Cleanup alter Benachrichtigungen
  setInterval(() => {
    checkSlaNotifications();
    cleanupOldNotifications();
  }, 5 * 60 * 1000);
});

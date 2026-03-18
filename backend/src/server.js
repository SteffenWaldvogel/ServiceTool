require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./config/database');

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
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { startEmailPolling } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions' }),
  secret: process.env.SESSION_SECRET || 'servicetool-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Protect all remaining /api routes
app.use('/api', requireAuth);

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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`Service Tool Backend läuft auf Port ${PORT}`);
  startEmailPolling();
});

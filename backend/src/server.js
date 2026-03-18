require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
const { startEmailPolling } = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/tickets', ticketsRouter);
app.use('/api/kunden', kundenRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/ersatzteile', ersatzteileRouter);
app.use('/api/maschinentypen', maschinentypenRouter);
app.use('/api/maschinen', maschinenRouter);
app.use('/api/stammdaten', stammdatenRouter);
app.use('/api/system', systemRouter);
app.use('/api/custom-fields', customFieldsAdminRouter);
app.use('/api/ansprechpartner', ansprechpartnerRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

app.listen(PORT, () => {
  console.log(`Service Tool Backend läuft auf Port ${PORT}`);
  startEmailPolling();
});

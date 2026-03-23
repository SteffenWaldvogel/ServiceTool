const express = require('express');
const router = express.Router();
const { isEnabled, analyzeEmail, suggestReply, summarizeTicket, findSimilarTickets } = require('../services/aiService');

// GET /api/ai/status
router.get('/status', (req, res) => {
  res.json({ enabled: isEnabled() });
});

// POST /api/ai/analyze-email
router.post('/analyze-email', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'KI nicht konfiguriert (ANTHROPIC_API_KEY fehlt)' });
  const { fromEmail, fromName, subject, message } = req.body;
  if (!message && !subject) return res.status(400).json({ error: 'subject oder message erforderlich' });

  const result = await analyzeEmail({ fromEmail, fromName, subject, message });
  if (!result) return res.status(500).json({ error: 'KI-Analyse fehlgeschlagen' });
  res.json(result);
});

// POST /api/ai/suggest-reply
router.post('/suggest-reply', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'KI nicht konfiguriert' });
  const { ticketnr } = req.body;
  if (!ticketnr) return res.status(400).json({ error: 'ticketnr erforderlich' });

  const result = await suggestReply({ ticketnr });
  if (!result) return res.status(500).json({ error: 'Antwort-Vorschlag fehlgeschlagen' });
  res.json(result);
});

// POST /api/ai/summarize
router.post('/summarize', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'KI nicht konfiguriert' });
  const { ticketnr } = req.body;
  if (!ticketnr) return res.status(400).json({ error: 'ticketnr erforderlich' });

  const result = await summarizeTicket({ ticketnr });
  if (!result) return res.status(500).json({ error: 'Zusammenfassung fehlgeschlagen' });
  res.json(result);
});

// POST /api/ai/similar
router.post('/similar', async (req, res) => {
  if (!isEnabled()) return res.status(503).json({ error: 'KI nicht konfiguriert' });
  const { subject, message } = req.body;

  const result = await findSimilarTickets({ subject, message });
  res.json(result);
});

module.exports = router;

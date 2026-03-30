const pool = require('../config/database');

// Einfaches In-Memory-Caching um DB-Load zu reduzieren (5-Sekunden TTL)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5000;

async function getMaintenanceStatus() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;
  try {
    const result = await pool.query('SELECT is_active, reason, estimated_end FROM maintenance_mode WHERE id = 1');
    cache = result.rows[0] || { is_active: false };
    cacheTime = now;
    return cache;
  } catch {
    return { is_active: false };
  }
}

function invalidateMaintenanceCache() {
  cache = null;
  cacheTime = 0;
}

// Middleware: prüft Wartungsmodus auf jede Anfrage
async function maintenanceModeMiddleware(req, res, next) {
  // Auth-Routen und der öffentliche Maintenance-Endpunkt dürfen immer durch
  if (req.path.startsWith('/auth/') || req.path === '/system/maintenance' || req.path === '/health') {
    return next();
  }

  const status = await getMaintenanceStatus();
  if (!status.is_active) return next();

  // Admins dürfen immer durch
  const u = req.session?.user;
  if (u && u.role === 'admin') return next();

  return res.status(503).json({
    error: 'maintenance',
    message: status.reason || 'Das System befindet sich im Wartungsmodus. Bitte versuchen Sie es später erneut.',
    estimated_end: status.estimated_end || null,
  });
}

module.exports = { maintenanceModeMiddleware, invalidateMaintenanceCache };

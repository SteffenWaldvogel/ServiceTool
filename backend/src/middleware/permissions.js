const pool = require('../config/database');

// Permission-Cache mit 5-Minuten TTL
const permCache = new Map(); // userId -> { permissions: string[], time: number }
const CACHE_TTL = 5 * 60 * 1000;

async function getUserPermissions(userId) {
  const now = Date.now();
  const cached = permCache.get(userId);
  if (cached && now - cached.time < CACHE_TTL) return cached.permissions;

  try {
    // Prüfen ob Admin (hat alle Rechte)
    const userResult = await pool.query(
      `SELECT r.name AS role FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) return [];
    if (userResult.rows[0].role === 'admin') {
      // Admin bekommt alle Permissions
      const allPerms = await pool.query('SELECT name FROM permissions');
      const permissions = allPerms.rows.map(r => r.name);
      permCache.set(userId, { permissions, time: now });
      return permissions;
    }

    // Permissions über user_roles (neue Mehrfach-Rollen) ermitteln
    const result = await pool.query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.permission_id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1
       UNION
       SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.permission_id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.user_id = $1`,
      [userId]
    );
    const permissions = result.rows.map(r => r.name);
    permCache.set(userId, { permissions, time: now });
    return permissions;
  } catch {
    return [];
  }
}

function invalidatePermCache(userId) {
  if (userId) {
    permCache.delete(userId);
  } else {
    permCache.clear();
  }
}

// Middleware-Factory: requirePermission('tickets', 'read')
function requirePermission(module, action) {
  const permName = `${module}:${action}`;
  return async (req, res, next) => {
    const u = req.session?.user;
    if (!u || !u.user_id) return res.status(401).json({ error: 'Nicht eingeloggt' });
    if (u.role === 'admin') return next();

    // Erst session-Permissions prüfen (schnell)
    if (Array.isArray(u.permissions) && u.permissions.includes(permName)) return next();

    // Dann aus DB holen (falls session veraltet ist)
    const permissions = await getUserPermissions(u.user_id);
    if (permissions.includes(permName)) return next();

    return res.status(403).json({ error: `Keine Berechtigung (${permName})` });
  };
}

module.exports = { getUserPermissions, requirePermission, invalidatePermCache };

function requireAuth(req, res, next) {
  const u = req.session?.user;
  if (!u || !u.user_id || !u.username)
    return res.status(401).json({ error: 'Nicht eingeloggt' });
  next();
}

function requireAdmin(req, res, next) {
  const u = req.session?.user;
  if (!u || !u.user_id || !u.username) return res.status(401).json({ error: 'Nicht eingeloggt' });
  if (u.role !== 'admin')
    return res.status(403).json({ error: 'Keine Berechtigung (Admin erforderlich)' });
  next();
}

function requirePermission(permName) {
  return (req, res, next) => {
    const u = req.session?.user;
    if (!u || !u.user_id || !u.username) return res.status(401).json({ error: 'Nicht eingeloggt' });
    // admin hat immer alle Rechte
    if (u.role === 'admin') return next();
    if (!u.permissions?.includes(permName))
      return res.status(403).json({ error: `Keine Berechtigung (${permName})` });
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requirePermission };

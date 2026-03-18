function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Nicht eingeloggt' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
  if (req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Keine Berechtigung (Admin erforderlich)' });
  next();
}

function requirePermission(permName) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Nicht eingeloggt' });
    // admin hat immer alle Rechte
    if (req.session.user.role === 'admin') return next();
    if (!req.session.user.permissions?.includes(permName))
      return res.status(403).json({ error: `Keine Berechtigung (${permName})` });
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requirePermission };

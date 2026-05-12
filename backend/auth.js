const jwt = require('jsonwebtoken');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env variable is not set');
  return s;
}

function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '12h' });
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), getSecret());
    next();
  } catch {
    return res.status(401).json({ error: 'Токен недействителен' });
  }
}

function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    next();
  });
}

module.exports = { signToken, verifyToken, requireAdmin };

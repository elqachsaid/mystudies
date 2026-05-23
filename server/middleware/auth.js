const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mystudies-jwt-secret-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح به' });
  }
  const token = header.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
  }
  req.user = decoded;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'صلاحية غير كافية' });
  }
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, adminMiddleware };

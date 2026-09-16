import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET de entorno no definido.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ error: 'Acceso prohibido: Rol de usuario no identificado' });
    }
    const normalizedRole = req.user.rol.toLowerCase();
    const isAllowed = allowedRoles.some(role => role.toLowerCase() === normalizedRole);

    if (!isAllowed) {
      return res.status(403).json({ error: `Acceso denegado: Se requiere rol ${allowedRoles.join(' o ')}` });
    }
    next();
  };
}

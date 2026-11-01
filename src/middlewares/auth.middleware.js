const jwt = require('jsonwebtoken');

// Middleware para verificar si el usuario envió un token JWT válido
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'] || req.headers['x-access-token'];

  if (!token) {
    return res.status(403).json({ message: 'Acceso denegado: Se requiere un token de autenticación' });
  }

  try {
    const tokenLimpio = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
    const decoded = jwt.verify(tokenLimpio, process.env.JWT_SECRET || 'secreto_super_seguro');
    req.usuario = decoded; // Adjuntamos los datos del usuario a la petición
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Middleware para validar que el usuario tenga rol de administrador
const esAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Acceso denegado: Requiere rol de Administrador' });
  }
};

module.exports = {
  verificarToken,
  esAdmin
};
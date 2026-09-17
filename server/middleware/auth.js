const jwt = require('jsonwebtoken');
const { UserRepository, validRoles } = require('../models/schema');

const JWT_SECRET = process.env.JWT_SECRET || 'problembridge_dev_secret_key_8842fbb';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to token no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserRepository.findById(decoded.id);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = req.user.role;
    if (userRole === 'Admin / Reviewer' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden. Role '${userRole}' is not authorized to perform this action.`
    });
  };
}

module.exports = {
  signToken,
  verifyToken,
  optionalAuth,
  requireRole,
  JWT_SECRET,
  validRoles
};

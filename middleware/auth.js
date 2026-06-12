import { verifyJwt } from '../utils/auth.js';

const getTokenCandidates = (req) => {
  const candidates = [];

  const authHeader = req.headers['authorization'];
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader?.split(' ')[1]?.trim();

  if (headerToken) candidates.push(headerToken);

  if (req.cookies) {
    for (const name of ['token', 'accessToken', 'jwt', 'session']) {
      if (req.cookies[name]) candidates.push(req.cookies[name]);
    }
  }

  return [...new Set(candidates)];
};

export const authenticateToken = (req, res, next) => {
  const candidates = getTokenCandidates(req);

  if (candidates.length === 0) {
    return res.status(401).json({ error: 'Access token required' });
  }

  for (const token of candidates) {
    const user = verifyJwt(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  return res.status(403).json({ error: 'Invalid or expired token' });
};

export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

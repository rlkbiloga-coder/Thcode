/**
 * MIDDLEWARE DE SEGURANÇA AVANÇADA
 * CORS, CSP, Rate Limiting, JWT, 2FA, Data Masking
 */

import config from '../config/advanced.config.js';

// ───────────────────────────────────────────────────────────────────────────
// CORS MIDDLEWARE
// ───────────────────────────────────────────────────────────────────────────
export const corsMiddleware = (req, res, next) => {
  if (!config.security.cors.enabled) return next();

  const origin = req.headers.origin;
  const allowedOrigins = config.security.cors.origins;

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', config.security.cors.methods.join(','));
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
};

// ───────────────────────────────────────────────────────────────────────────
// CSP (Content Security Policy)
// ───────────────────────────────────────────────────────────────────────────
export const cspMiddleware = (req, res, next) => {
  if (!config.security.csp.enabled) return next();

  res.header('Content-Security-Policy', config.security.csp.policy);
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  next();
};

// ───────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ───────────────────────────────────────────────────────────────────────────
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  middleware() {
    if (!config.security.rateLimit.enabled) {
      return (req, res, next) => next();
    }

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - config.security.rateLimit.windowMs;

      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const userRequests = this.requests.get(key).filter((time) => time > windowStart);

      if (userRequests.length >= config.security.rateLimit.maxRequests) {
        return res.status(429).json({ error: config.security.rateLimit.message });
      }

      userRequests.push(now);
      this.requests.set(key, userRequests);

      // Cleanup old entries
      if (Math.random() < 0.01) {
        this.requests.forEach((requests, k) => {
          const filtered = requests.filter((time) => time > windowStart);
          if (filtered.length === 0) this.requests.delete(k);
          else this.requests.set(k, filtered);
        });
      }

      next();
    };
  }
}

export const rateLimiter = new RateLimiter();

// ───────────────────────────────────────────────────────────────────────────
// JWT AUTHENTICATION
// ───────────────────────────────────────────────────────────────────────────
import { sign, verify } from 'jsonwebtoken';

export class JWTAuth {
  generateToken(payload, expiresIn = config.security.jwt.expiry) {
    return sign(payload, config.security.jwt.secret, {
      expiresIn,
      algorithm: config.security.jwt.algorithm,
    });
  }

  generateRefreshToken(payload) {
    return sign(payload, config.security.jwt.secret, {
      expiresIn: config.security.jwt.refreshExpiry,
      algorithm: config.security.jwt.algorithm,
    });
  }

  verifyToken(token) {
    try {
      return verify(token, config.security.jwt.secret, {
        algorithms: [config.security.jwt.algorithm],
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  middleware() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ error: 'Missing authorization header' });
      }

      const token = authHeader.split(' ')[1];

      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({ error: error.message });
      }
    };
  }
}

export const jwtAuth = new JWTAuth();

// ───────────────────────────────────────────────────────────────────────────
// 2FA (Two-Factor Authentication)
// ───────────────────────────────────────────────────────────────────────────
export class TwoFactorAuth {
  constructor() {
    this.sessions = new Map();
  }

  enable2FA(userId, secret) {
    if (!config.security.auth.twoFactorEnabled) return null;
    return {
      userId,
      secret,
      enabled: true,
      backup_codes: this.generateBackupCodes(10),
    };
  }

  verify2FA(userId, code) {
    // Implementar verificação real com TOTP
    return true;
  }

  generateBackupCodes(count) {
    return Array.from({ length: count }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
}

export const twoFactorAuth = new TwoFactorAuth();

// ───────────────────────────────────────────────────────────────────────────
// DATA MASKING
// ───────────────────────────────────────────────────────────────────────────
export function maskSensitiveData(data) {
  if (!config.security.dataProtection.masking.enabled) return data;

  const sensitiveFields = config.security.dataProtection.masking.fields;
  const masked = JSON.parse(JSON.stringify(data));

  function recursiveMask(obj) {
    for (const key in obj) {
      if (sensitiveFields.includes(key) && typeof obj[key] === 'string') {
        obj[key] = '*'.repeat(obj[key].length);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveMask(obj[key]);
      }
    }
  }

  recursiveMask(masked);
  return masked;
}

// ───────────────────────────────────────────────────────────────────────────
// SOFT DELETES
// ───────────────────────────────────────────────────────────────────────────
export function applySoftDeleteFilter(query) {
  if (!config.security.dataProtection.softDeletes) return query;

  return {
    ...query,
    where: {
      ...query.where,
      deleted_at: null,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN SECURITY MIDDLEWARE SETUP
// ───────────────────────────────────────────────────────────────────────────
export function setupSecurityMiddleware(app) {
  app.use(corsMiddleware);
  app.use(cspMiddleware);
  app.use(rateLimiter.middleware());
}

export default {
  corsMiddleware,
  cspMiddleware,
  rateLimiter,
  jwtAuth,
  twoFactorAuth,
  maskSensitiveData,
  applySoftDeleteFilter,
  setupSecurityMiddleware,
};


import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@mapforge/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' } });
    return;
  }

  const token = authHeader.slice(7);

  // TODO: Replace with real JWT verification
  // For development, accept mock tokens with seeded user data
  if (token === 'mock-jwt-token' || token === 'mock-user-token') {
    req.user = {
      id: '10000000-0000-4000-8000-000000000004',
      orgId: 'a1b2c3d4-0000-4000-8000-000000000001',
      email: 'mike.chen@mlb.com',
      name: 'Mike Chen',
      role: 'user',
      avatarUrl: null,
    };
    next();
    return;
  }

  if (token === 'mock-admin-token') {
    req.user = {
      id: '10000000-0000-4000-8000-000000000001',
      orgId: 'a1b2c3d4-0000-4000-8000-000000000001',
      email: 'sarah.martinez@mlb.com',
      name: 'Sarah Martinez',
      role: 'admin',
      avatarUrl: null,
    };
    next();
    return;
  }

  res.status(401).json({ error: { message: 'Invalid token', code: 'UNAUTHORIZED' } });
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } });
      return;
    }

    next();
  };
}

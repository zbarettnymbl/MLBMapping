import type { Request, Response, NextFunction } from 'express';

// Note: Express.Request.user is declared in ./auth.ts using AuthUser from @mapforge/shared

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Assumes req.user is populated by auth middleware (from Phase 1)
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

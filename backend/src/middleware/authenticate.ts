import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorised', code: 'AUTH_TOKEN_INVALID' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorised', code: 'AUTH_TOKEN_INVALID' });
      return;
    }

    const decoded = verifyAccessToken(token);
    // @ts-ignore
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorised', code: 'AUTH_TOKEN_INVALID' });
  }
}

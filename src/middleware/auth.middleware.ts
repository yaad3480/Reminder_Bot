import { Request, Response, NextFunction } from 'express';

/**
 * Admin Authentication Middleware
 * Hardcoded credentials: admin/admin
 */
export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized - No credentials provided' });
    }

    // Expected format: "Basic base64(username:password)"
    const [authType, credentials] = authHeader.split(' ');

    if (authType !== 'Basic' || !credentials) {
        return res.status(401).json({ error: 'Unauthorized - Invalid format' });
    }

    // Decode base64 credentials
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    // Hardcoded credentials
    if (username === 'admin' && password === 'admin') {
        next(); // Authentication successful
    } else {
        return res.status(403).json({ error: 'Forbidden - Invalid credentials' });
    }
};

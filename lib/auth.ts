import { VercelRequest, VercelResponse } from '@vercel/node';
import { sign, verify } from 'jsonwebtoken';

const API_SECRET = process.env.API_SECRET || 'your-secret-key-change-in-production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

/**
 * Generate API token (call this once and share with authorized clients)
 */
export function generateToken(metadata: Record<string, unknown> = {}): string {
  return sign({ ...metadata, iat: Date.now() }, API_SECRET, { expiresIn: '365d' });
}

/**
 * Verify API token from Authorization header
 */
export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const decoded = verify(token, API_SECRET);
    return typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Middleware: Check CORS origin
 */
export function checkCORS(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || req.headers.referer;
  
  if (!origin) {
    // Allow requests without origin (e.g., curl, server-to-server)
    return true;
  }

  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    allowed === '*' || origin.startsWith(allowed)
  );

  if (!isAllowed) {
    res.status(403).json({ 
      success: false, 
      error: 'CORS policy: Origin not allowed' 
    });
    return false;
  }

  return true;
}

/**
 * Middleware: Set CORS headers
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin || 'http://localhost:5173';
  
  // Only set if origin is allowed
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

/**
 * Middleware: Require API authentication
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ 
      success: false, 
      error: 'Authentication required. Use Authorization: Bearer <token>' 
    });
    return false;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
    return false;
  }

  return true;
}

/**
 * Middleware: Validate request body against schema
 */
export async function validateBody<T>(
  req: VercelRequest, 
  res: VercelResponse,
  schema: { parse: (data: unknown) => T }
): Promise<T | null> {
  try {
    const validated = schema.parse(req.body);
    return validated as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: message
    });
    return null;
  }
}

/**
 * Middleware: Validate query parameters against schema
 */
export async function validateQuery<T>(
  req: VercelRequest,
  res: VercelResponse,
  schema: { parse: (data: unknown) => T }
): Promise<T | null> {
  try {
    const validated = schema.parse(req.query);
    return validated as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: message
    });
    return null;
  }
}

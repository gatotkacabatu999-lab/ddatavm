import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Middleware: Set permissive CORS headers
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
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

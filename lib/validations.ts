import { z } from 'zod';

// Calendar validations
export const calendarEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  type: z.enum(['event', 'holiday']).optional().default('event'),
});

// Delivery validations
export const deliverySchema = z.object({
  tracking_no: z.string().min(1, 'Tracking number required').max(100),
  recipient_name: z.string().max(255).optional(),
  address: z.string().max(1000).optional(),
  status: z.enum(['pending', 'in-transit', 'delivered', 'failed']).optional().default('pending'),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(2000).optional(),
});

// Notes validations
export const noteSchema = z.object({
  id: z.string().min(1, 'ID required'),
  type: z.enum(['note', 'changelog']).default('note'),
  title: z.string().max(500).optional().default(''),
  content: z.string().min(1, 'Content required').max(10000, 'Content too long'),
  version: z.string().max(50).optional(),
  author: z.string().max(255).optional().default('Admin'),
  pinned: z.boolean().optional().default(false),
});

// Route validations
export const routeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100),
  shift: z.enum(['AM', 'PM']).optional().default('AM'),
  deliveryPoints: z.array(z.unknown()).optional().default([]),
  color: z.string().regex(/^#([A-F0-9]{6}|[A-F0-9]{3})$/, 'Invalid hex color').optional(),
});

// Rooster validations
export const roosterResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  role: z.string().max(100).optional().default(''),
  color: z.string().regex(/^#([A-F0-9]{6}|[A-F0-9]{3})$/).optional().default('#3B82F6'),
});

export const roosterShiftSchema = z.object({
  id: z.string().min(1),
  resource_id: z.string().min(1),
  title: z.string().min(1).max(200),
  shift_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_hour: z.number().int().min(0).max(23).optional().default(8),
  end_hour: z.number().int().min(0).max(23).optional().default(16),
  color: z.string().regex(/^#([A-F0-9]{6}|[A-F0-9]{3})$/).optional().default('#3B82F6'),
});

// Route notes validations
export const routeNoteSchema = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  type: z.enum(['note', 'changelog']).default('note'),
  text: z.string().min(1).max(10000),
});

// Image upload validation
export const imageUploadSchema = z.object({
  url: z.string().url('Invalid URL').max(2000, 'URL too long'),
});

// Plano validations
export const planoPageSchema = z.object({
  pages: z.array(z.unknown()).min(0),
});

// API Key validation
export const apiKeySchema = z.object({
  key: z.string().min(1, 'API key required'),
});

// Pagination
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

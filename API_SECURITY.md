# API Security & Authentication Guide

## Overview

This guide explains the security improvements made to the API and how to use authenticated endpoints.

## Critical Changes

### 1. API Authentication (JWT)

All write operations (POST, PATCH, DELETE) now require authentication.

**How to authenticate:**

1. Generate an API token (one-time setup):
   ```typescript
   import { generateToken } from './lib/auth';
   
   // Generate token for admin/authorized user
   const token = generateToken({ role: 'admin', userId: 'user-123' });
   ```

2. Include token in request headers:
   ```bash
   curl -X POST https://your-api.com/api/calendar \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"title":"Event","event_date":"2024-05-10"}'
   ```

3. In JavaScript/fetch:
   ```typescript
   const token = localStorage.getItem('api_token');
   
   const response = await fetch('/api/calendar', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       title: 'Event',
       event_date: '2024-05-10'
     })
   });
   ```

### 2. CORS Configuration

- No longer allows all origins (`*`)
- Configure allowed origins in `.env`:
  ```
  ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
  ```

### 3. Input Validation

All API endpoints now validate input using Zod schemas:

- Invalid data returns `422 Unprocessable Entity`
- Error messages include validation details
- Prevents malformed requests

Example:
```bash
POST /api/calendar
{
  "title": "",  # ❌ Too short
  "event_date": "2024-13-45"  # ❌ Invalid date
}

Response: 
{
  "success": false,
  "error": "Validation failed",
  "details": "..."
}
```

### 4. Image Upload Security

- ImgBB API key no longer exposed in client
- All uploads go through `/api/upload` endpoint
- Backend securely handles the key

Before (❌ Insecure):
```typescript
// API key visible in browser network tab
fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`)
```

After (✅ Secure):
```typescript
// Key stays on backend
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## HTTP Status Codes

API now returns proper HTTP status codes:

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success (GET, DELETE) | Calendar event deleted |
| 201 | Created (POST) | New route created |
| 400 | Bad request | Missing required field |
| 401 | Unauthorized | No auth token provided |
| 403 | Forbidden | Origin not allowed |
| 404 | Not found | Endpoint doesn't exist |
| 405 | Method not allowed | PUT on GET-only endpoint |
| 422 | Validation error | Invalid data format |
| 500 | Server error | Database error |

## Environment Variables Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in required values:
   ```
   DATABASE_URL=postgresql://...
   API_SECRET=your-very-secret-key
   ALLOWED_ORIGINS=http://localhost:5173
   IMGBB_API_KEY=your-imgbb-key
   ```

3. For Vercel deployment, add to project settings:
   - Settings → Environment Variables
   - Add each variable from `.env.example`

## Database Indexes

Added indexes for performance:

```sql
-- Calendar events by date
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);

-- Deliveries by status
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- Deliveries by tracking number
CREATE INDEX idx_deliveries_tracking_no ON deliveries(tracking_no);

-- Route notes by route ID
CREATE INDEX idx_route_notes_route_id ON route_notes(route_id);
```

These are created automatically on first API call.

## Security Checklist

- ✅ API requires authentication for writes
- ✅ CORS restricted to allowed origins
- ✅ Input validation on all endpoints
- ✅ API key secured in backend
- ✅ Proper HTTP status codes
- ✅ Database query indexes for performance
- ✅ Security headers set (X-Content-Type-Options, X-Frame-Options)
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: Request size limits
- ⚠️ TODO: Error boundary components

## Remaining Security Tasks

1. **Rate Limiting** - Prevent abuse
   ```typescript
   import rateLimit from 'express-rate-limit';
   ```

2. **Request Size Limits**
   ```typescript
   app.use(express.json({ limit: '10mb' }));
   ```

3. **Audit Logging** - Track all write operations
4. **Web Application Firewall** - Add on Vercel

## Frontend Implementation

Update your API calls to include authentication:

```typescript
// lib/api.ts
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('api_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// Usage
await apiCall('/calendar', {
  method: 'POST',
  body: JSON.stringify({ title: 'Event', event_date: '2024-05-10' })
});
```

## Support

For issues or questions about the API:
1. Check error messages for validation details
2. Verify API token is valid and included
3. Confirm CORS origin is in ALLOWED_ORIGINS
4. Check console logs for detailed error information

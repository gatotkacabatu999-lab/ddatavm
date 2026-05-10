import type { VercelRequest, VercelResponse } from '@vercel/node';
import { imageUploadSchema } from '../lib/validations';
import { validateBody } from '../lib/auth';

/**
 * Backend-side image proxy and upload handler
 * Keeps ImgBB API key secure (never exposed to client)
 */
export async function handleImageUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // For direct image uploads to ImgBB
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Image service not configured'
      });
    }

    try {
      const formData = new FormData();
      const buffer = await req.file.arrayBuffer();
      const blob = new Blob([buffer], { type: req.file.mimetype });
      formData.append('image', blob, req.file.originalname);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? 'Upload failed');
      }

      const imageUrl = payload.data?.display_url ?? payload.data?.url;
      if (!imageUrl) {
        throw new Error('Upload succeeded without an image URL');
      }

      return res.status(200).json({
        success: true,
        data: { url: imageUrl }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: `Method ${req.method} not allowed`
  });
}

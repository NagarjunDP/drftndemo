import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

export const maxDuration = 60;

// Configure Cloudinary Node SDK using server environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    // 1. Verify admin session/auth before proceeding
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing' },
        { status: 401 }
      );
    }

    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!apiKey || !apiSecret || !cloudName) {
      console.error('[Upload Image API] Missing Cloudinary server credentials in environment.');
      return NextResponse.json(
        { error: 'Cloudinary credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/png';

    const contentType = request.headers.get('content-type') || '';

    // 2. Accept bg-removed image as multipart/form-data or base64 JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No image file provided in form data.' },
          { status: 400 }
        );
      }

      // Enforce 5MB per-file limit
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image file exceeds 5MB limit.' },
          { status: 400 }
        );
      }

      mimeType = file.type || 'image/png';
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      const { imageBase64, mimeType: customMime } = body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return NextResponse.json(
          { error: 'imageBase64 parameter is required.' },
          { status: 400 }
        );
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');

      if (fileBuffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image file exceeds 5MB limit.' },
          { status: 400 }
        );
      }

      if (customMime) mimeType = customMime;
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    // 3. Upload via Cloudinary Node SDK with transformations suited for clothing product shots:
    // - quality: auto, fetch_format: auto
    // - e_improve (auto color/contrast)
    // - e_sharpen:60 for garment detail
    // - keep background as-is post-removal
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataUri,
        {
          folder: 'drftn-products',
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { effect: 'improve' },
            { effect: 'sharpen:60' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    let secureUrl: string = uploadResult.secure_url || uploadResult.url;

    // Ensure transformation delivery parameters are formatted into the URL
    if (secureUrl && secureUrl.includes('/upload/')) {
      if (!secureUrl.includes('f_auto,q_auto,e_improve,e_sharpen:60')) {
        secureUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto,e_improve,e_sharpen:60/');
      }
    }

    return NextResponse.json({ secure_url: secureUrl });
  } catch (error: any) {
    console.error('[Upload Image API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image to Cloudinary.' },
      { status: 500 }
    );
  }
}

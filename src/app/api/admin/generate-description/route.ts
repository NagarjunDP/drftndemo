import { NextResponse } from 'next/server';

// ⚠️  SECURITY: GEMINI_API_KEY is a server-only env var.
// It is read exclusively inside this Route Handler and never serialised
// into any client bundle or API response.

const DRFTN_SYSTEM_PROMPT = `You are the head copywriter for DRFTN — an Indian luxury streetwear brand built on the philosophy of "Controlled Chaos". DRFTN pieces are heavy, oversized, minimal-but-intense, and carry a raw premium identity.

Your job: analyse the uploaded garment photo and produce strictly a JSON object with three keys:

"title"       – A bold 2–5 word product name in DRFTN's voice. Format: adjective + garment type (e.g. "Raw Boxy Hoodie", "Washed Cargo Pant", "Distressed Oversized Tee", "Stitch Drop Shoulder"). No brand name prefix. No emoji.

"description" – 2–3 sentences. Lead with the silhouette + construction detail. Follow with fabric feel / weight (estimate GSM if visible). Close with the DRFTN aesthetic signature — controlled, minimal, intentional. Tone: direct, confident, zero filler. Do NOT use words like "elevate", "perfect for", "versatile", or "effortlessly".

"tags"        – Array of 6–10 lowercase SEO tags. Mix garment type, fabric, fit, aesthetic, occasion (e.g. ["oversized hoodie", "heavyweight fleece", "boxy fit", "drop shoulder", "streetwear", "240 gsm", "dark aesthetic", "unisex"]).

Return ONLY the raw JSON. No markdown fences. No commentary. No extra keys.`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Hard-fail if key is not configured — do not silently return placeholder data
    if (!apiKey || apiKey.trim() === '') {
      console.error('[Gemini] GEMINI_API_KEY is not set in .env.local');
      return NextResponse.json(
        { error: 'AI generation is not configured. Add GEMINI_API_KEY to .env.local.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { imageBase64, imageUrl, mimeType: bodyMimeType } = body;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    let finalBase64: string;
    let finalMimeType: string = bodyMimeType || 'image/jpeg';

    if (imageUrl && typeof imageUrl === 'string') {
      // Path A: server-side URL fetch — no CORS issues, works with any Cloudinary URL
      try {
        const imgRes = await fetch(imageUrl, { headers: { Accept: 'image/*' } });
        if (!imgRes.ok) {
          return NextResponse.json(
            { error: `Failed to fetch image from URL (HTTP ${imgRes.status}).` },
            { status: 400 }
          );
        }
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        finalMimeType = allowedMimeTypes.find(t => contentType.includes(t)) ?? 'image/jpeg';
        const arrayBuffer = await imgRes.arrayBuffer();
        finalBase64 = Buffer.from(arrayBuffer).toString('base64');
      } catch (fetchErr: any) {
        console.error('[generate-description] Failed to fetch imageUrl:', fetchErr?.message);
        return NextResponse.json(
          { error: 'Could not fetch image from the provided URL.' },
          { status: 400 }
        );
      }
    } else if (imageBase64 && typeof imageBase64 === 'string') {
      // Path B: base64 inline data (existing file-upload flow — unchanged)
      finalBase64 = imageBase64;
      if (!allowedMimeTypes.includes(finalMimeType)) {
        return NextResponse.json({ error: 'Unsupported image mimeType.' }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'Either imageUrl or imageBase64 is required.' },
        { status: 400 }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: DRFTN_SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType: finalMimeType,
                  data: finalBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 1024,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error(`[Gemini] HTTP ${geminiRes.status}:`, errBody);
      return NextResponse.json(
        { error: `Gemini API error (${geminiRes.status}). Check server logs.` },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();

    // Correct response path: candidates[0].content.parts[0].text
    const rawText: string | undefined =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('[Gemini] Unexpected response shape:', JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: 'Gemini returned an empty response.' }, { status: 502 });
    }

    let parsed: { title?: string; description?: string; tags?: string[] };
    try {
      let cleanText = rawText.trim();
      // Clean up markdown block wraps if present
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
        cleanText = cleanText.replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleanText);
    } catch (err: any) {
      console.error('[Gemini] Failed to parse JSON from model output:', rawText);
      console.error('[Gemini] Parse error:', err?.message ?? err);
      return NextResponse.json({ error: 'Gemini response was not valid JSON.' }, { status: 502 });
    }

    return NextResponse.json({
      title: (parsed.title ?? '').trim(),
      description: (parsed.description ?? '').trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase().trim()) : [],
    });

  } catch (error: any) {
    console.error('[generate-description] Unhandled error:', error?.message ?? error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getPublicStatusPageData } from '@/services/status-page-service';
import { rateLimiter, getClientIp, createRateLimitResponse } from '@/lib/rate-limiter';

export async function GET(request, { params }) {
  // Rate Limiting on public status page (60 requests per minute per IP)
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiter.check(`status:public:${clientIp}`, {
    maxRequests: 60,
    windowMs: 60 * 1000,
  });

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      return NextResponse.json({ error: 'Slug invalide' }, { status: 400 });
    }

    const publicData = await getPublicStatusPageData(slug);

    return NextResponse.json(publicData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error.message === 'StatusPageDisabledOrNotFound' || error.message?.includes('DisabledOrNotFound')) {
      return NextResponse.json({ error: 'Status page not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Status page not found' },
      { status: 404 }
    );
  }
}

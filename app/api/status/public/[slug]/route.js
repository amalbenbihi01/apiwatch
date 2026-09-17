import { NextResponse } from 'next/server';
import { getPublicStatusPageData } from '@/services/status-page-service';

export async function GET(request, { params }) {
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

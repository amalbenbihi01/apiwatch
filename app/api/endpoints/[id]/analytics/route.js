import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEndpointAnalytics } from '@/services/analytics-service';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';

    const analytics = await getEndpointAnalytics(id, session.userId, period);

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du calcul des analytics' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

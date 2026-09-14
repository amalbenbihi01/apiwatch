import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getGlobalAnalytics } from '@/services/analytics-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const globalAnalytics = await getGlobalAnalytics(session.userId);

    return NextResponse.json({ globalAnalytics }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des analytics globales' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkApiEndpoint } from '@/services/monitoring-service';

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const check = await checkApiEndpoint(id, session.userId);

    return NextResponse.json({ success: true, check }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l’exécution du health check' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

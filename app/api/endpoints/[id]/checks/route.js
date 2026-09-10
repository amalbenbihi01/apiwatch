import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getApiChecks } from '@/services/monitoring-service';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const checks = await getApiChecks(id, session.userId);

    return NextResponse.json({ checks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération de l’historique des checks' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

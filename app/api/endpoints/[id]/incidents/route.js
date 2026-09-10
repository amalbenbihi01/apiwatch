import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEndpointIncidents } from '@/services/incident-service';

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const incidents = await getEndpointIncidents(id, session.userId);

    return NextResponse.json({ incidents }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des incidents de l’endpoint' },
      { status: error.message?.includes('accès refusé') || error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

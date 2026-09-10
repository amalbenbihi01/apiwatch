import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserIncidents } from '@/services/incident-service';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    const incidents = await getUserIncidents(session.userId, statusParam);

    return NextResponse.json({ incidents }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des incidents' },
      { status: 500 }
    );
  }
}

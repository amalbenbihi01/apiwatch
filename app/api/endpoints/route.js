import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createApiEndpoint, getUserApiEndpoints } from '@/services/api-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const endpoints = await getUserApiEndpoints(session.userId);
    return NextResponse.json({ endpoints }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des APIs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const endpoint = await createApiEndpoint(session.userId, body);

    return NextResponse.json({ success: true, endpoint }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de l’API' },
      { status: 400 }
    );
  }
}

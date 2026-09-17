import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStatusPageConfig,
  updateStatusPageConfig,
} from '@/services/status-page-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const config = await getStatusPageConfig(session.userId);

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updatedConfig = await updateStatusPageConfig(session.userId, body);

    return NextResponse.json(updatedConfig, { status: 200 });
  } catch (error) {
    const message = error.message || '';
    if (message.includes('déjà utilisé')) {
      return NextResponse.json({ error: message }, { status: 409 }); // 409 Conflict
    }

    if (message.includes('slug') || message.includes('caractères') || message.includes('invalide')) {
      return NextResponse.json({ error: message }, { status: 400 }); // 400 Bad Request
    }

    return NextResponse.json(
      { error: message || 'Erreur lors de la mise à jour de la configuration' },
      { status: 500 }
    );
  }
}

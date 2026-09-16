import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markNotificationAsRead } from '@/services/in-app-notification-service';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const result = await markNotificationAsRead(id, session.userId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du marquage comme lu' },
      { status: error.message?.includes('introuvable') ? 404 : 400 }
    );
  }
}

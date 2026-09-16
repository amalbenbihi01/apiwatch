import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { markAllNotificationsAsRead } from '@/services/in-app-notification-service';

export async function PATCH() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const result = await markAllNotificationsAsRead(session.userId);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du marquage global comme lu' },
      { status: 500 }
    );
  }
}

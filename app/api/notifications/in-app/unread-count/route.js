import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/services/in-app-notification-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await getUnreadNotificationCount(session.userId);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du comptage des notifications non lues' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserNotificationLogs } from '@/services/notification-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const logs = await getUserNotificationLogs(session.userId);

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération du journal des notifications' },
      { status: 500 }
    );
  }
}

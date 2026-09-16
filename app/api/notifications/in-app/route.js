import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserInAppNotifications } from '@/services/in-app-notification-service';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const status = searchParams.get('status');

    const result = await getUserInAppNotifications(session.userId, {
      page,
      limit,
      unreadOnly: status === 'unread',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des notifications In-App' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '@/services/notification-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const preferences = await getUserNotificationPreferences(session.userId);

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des préférences' },
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
    if (typeof body.emailNotificationsEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Paramètre emailNotificationsEnabled (boolean) requis' },
        { status: 400 }
      );
    }

    const preferences = await updateUserNotificationPreferences(session.userId, {
      emailNotificationsEnabled: body.emailNotificationsEnabled,
    });

    return NextResponse.json({ preferences }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour des préférences' },
      { status: 500 }
    );
  }
}

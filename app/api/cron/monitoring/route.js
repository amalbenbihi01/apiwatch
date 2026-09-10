import { NextResponse } from 'next/server';
import { runAutomaticMonitoring } from '@/services/monitoring-service';

export async function POST(request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    // Fail-Closed Guard: If CRON_SECRET is missing or empty, deny access immediately
    if (!cronSecret || cronSecret.trim() === '') {
      console.error('[Security] Tentative d’accès à /api/cron/monitoring mais CRON_SECRET n’est pas configuré.');
      return NextResponse.json(
        { error: 'Accès refusé : CRON_SECRET non configuré' },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${cronSecret}`;

    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Accès refusé : Jeton Authorization invalide' },
        { status: 401 }
      );
    }

    const summary = await runAutomaticMonitoring();
    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors du déclenchement du monitoring' },
      { status: 500 }
    );
  }
}

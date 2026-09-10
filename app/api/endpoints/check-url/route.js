import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { urlSchema } from '@/services/api-service';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const urlValidation = urlSchema.safeParse(body?.url);

    if (!urlValidation.success) {
      const errorMessage =
        urlValidation.error.issues[0]?.message || 'L\'URL doit commencer par http:// ou https://';
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }

    const targetUrl = urlValidation.data;
    const httpMethod = (body?.method || 'GET').toUpperCase();

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(targetUrl, {
        method: httpMethod === 'HEAD' || httpMethod === 'GET' ? httpMethod : 'GET',
        headers: {
          'User-Agent': 'APIWatch-HealthCheck/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      return NextResponse.json(
        {
          success: response.ok,
          status: response.status,
          responseTimeMs,
          message: response.ok
            ? `API accessible — ${response.status} — ${responseTimeMs} ms`
            : `API répond avec statut ${response.status} — ${responseTimeMs} ms`,
        },
        { status: 200 }
      );
    } catch (fetchError) {
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      let failureMessage = 'API inaccessible';
      if (fetchError.name === 'AbortError') {
        failureMessage = 'API inaccessible (Timeout dépassé - 5s)';
      } else if (fetchError.code === 'ENOTFOUND') {
        failureMessage = 'API inaccessible (Nom de domaine introuvable)';
      } else if (fetchError.code === 'ECONNREFUSED') {
        failureMessage = 'API inaccessible (Connexion refusée sur le serveur distant)';
      }

      return NextResponse.json(
        {
          success: false,
          status: null,
          responseTimeMs,
          message: failureMessage,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors du test de connexion' },
      { status: 500 }
    );
  }
}

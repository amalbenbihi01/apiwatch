import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { testWebhookEndpoint } from '@/services/webhook-service';

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      // Body is optional if testing already saved endpoint configuration
      body = {};
    }

    const result = await testWebhookEndpoint(session.userId, id, body);

    return NextResponse.json(
      {
        success: result.success,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    const isNotFound =
      error.message?.includes('accès refusé') || error.message?.includes('non trouvée');

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Erreur lors du test du webhook',
      },
      { status: isNotFound ? 404 : 400 }
    );
  }
}

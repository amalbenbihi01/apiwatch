import { NextResponse } from 'next/server';
import { getActiveTeamContext, enforceRole } from '@/lib/team-context';
import { getApiEndpointById, updateApiEndpoint, deleteApiEndpoint } from '@/services/api-service';

export async function GET(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'VIEWER');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const endpoint = await getApiEndpointById(context.team.id, id);

    return NextResponse.json({ endpoint }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'API non trouvée ou accès refusé' },
      { status: 404 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'MEMBER');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const body = await request.json();
    const endpoint = await updateApiEndpoint(context.team.id, id, body);

    return NextResponse.json({ success: true, endpoint }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la modification' },
      { status: 400 }
    );
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(request, { params }) {
  try {
    const context = await getActiveTeamContext();
    const guard = enforceRole(context, 'ADMIN');
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    await deleteApiEndpoint(context.team.id, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 400 }
    );
  }
}

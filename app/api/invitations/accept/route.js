import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getInvitationByRawToken, acceptInvitation } from '@/services/team-service';
import { cookies } from 'next/headers';
import { ACTIVE_TEAM_COOKIE_NAME } from '@/lib/team-context';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token d'invitation manquant" }, { status: 400 });
    }

    const result = await getInvitationByRawToken(token);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, invitation: result.invitation });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur de validation de l'invitation" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accepter cette invitation.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token d'invitation manquant" }, { status: 400 });
    }

    const result = await acceptInvitation(token, session.userId);

    // Switch active team cookie to accepted team
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, result.teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation acceptée avec succès',
      teamId: result.teamId,
      teamName: result.teamName,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de l'acceptation de l'invitation" },
      { status: 400 }
    );
  }
}

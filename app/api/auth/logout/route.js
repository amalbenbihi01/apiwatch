import { NextResponse } from 'next/server';
import { removeSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    await removeSessionCookie();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}

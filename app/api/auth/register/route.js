import { NextResponse } from 'next/server';
import { registerUser } from '@/services/auth-service';
import { createSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const user = await registerUser(body);
    await createSessionCookie(user);

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l’inscription' },
      { status: 400 }
    );
  }
}

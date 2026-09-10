import { NextResponse } from 'next/server';
import { loginUser } from '@/services/auth-service';
import { createSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const user = await loginUser(body);
    await createSessionCookie(user);

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Identifiants incorrects' },
      { status: 401 }
    );
  }
}

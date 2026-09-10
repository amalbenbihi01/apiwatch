import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'apiwatch_session';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod';
const key = new TextEncoder().encode(JWT_SECRET);

export async function signSessionToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function createSessionCookie(user) {
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch (err) {
    return null;
  }
}

export async function removeSessionCookie() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

import { getSession } from './auth.js';
import { prisma } from './prisma.js';
import { verifyCsrfOrigin } from './csrf-guard.js';

export const ACTIVE_TEAM_COOKIE_NAME = 'apiwatch_active_team';

export const ROLE_HIERARCHY = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/**
 * Check if a role satisfies the minimum required role
 */
export function hasMinimumRole(currentRole, requiredRole) {
  const currentWeight = ROLE_HIERARCHY[currentRole] || 0;
  const requiredWeight = ROLE_HIERARCHY[requiredRole] || 0;
  return currentWeight >= requiredWeight;
}

/**
 * Resolves the authenticated user, active team, and team role from session and cookies.
 * Does NOT create any team silently. If user has no teams, returns 403 error context.
 */
export async function getActiveTeamContext() {
  const session = await getSession();
  if (!session || !session.userId) {
    return {
      error: 'Non authentifié',
      status: 401,
      user: null,
      team: null,
      role: null,
    };
  }

  const authenticatedUser = {
    id: session.userId,
    userId: session.userId,
    email: session.email,
    name: session.name,
  };

  let activeTeamIdCookie = null;
  let cookieStore = null;

  try {
    const { cookies } = await import('next/headers');
    cookieStore = await cookies();
    activeTeamIdCookie = cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value;
  } catch (err) {
    // In standalone scripts or contexts without next/headers
  }

  let membership = null;

  // 1. Try with the active team cookie if present
  if (activeTeamIdCookie) {
    membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: activeTeamIdCookie,
          userId: session.userId,
        },
      },
      include: {
        team: true,
      },
    });
  }

  // 2. Fallback to the first available team membership if cookie was invalid or missing
  if (!membership) {
    membership = await prisma.teamMember.findFirst({
      where: {
        userId: session.userId,
      },
      include: {
        team: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // If fallback found and cookieStore available, refresh the active team cookie
    if (membership && cookieStore) {
      try {
        cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, membership.teamId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      } catch (e) {
        // Ignore headers mutation errors in read-only contexts
      }
    }
  }

  // 3. If the user belongs to no team at all, return explicit 403 error
  if (!membership) {
    return {
      error: 'Aucune équipe associée à ce compte.',
      status: 403,
      user: authenticatedUser,
      team: null,
      role: null,
    };
  }

  return {
    error: null,
    status: 200,
    user: authenticatedUser,
    team: membership.team,
    role: membership.role,
    membershipId: membership.id,
  };
}

/**
 * Helper to enforce RBAC permissions and optional CSRF protection on a context
 */
export function enforceRole(context, requiredRole, request = null) {
  // 1. If request is provided, verify CSRF Origin for mutable operations
  if (request) {
    const csrfResult = verifyCsrfOrigin(request);
    if (!csrfResult.valid) {
      return {
        authorized: false,
        response: typeof Response !== 'undefined'
          ? Response.json({ error: csrfResult.error }, { status: 403 })
          : { error: csrfResult.error, status: 403 },
      };
    }
  }

  // 2. Check context authentication errors
  if (context.error) {
    return {
      authorized: false,
      response: typeof Response !== 'undefined'
        ? Response.json({ error: context.error }, { status: context.status })
        : { error: context.error, status: context.status },
    };
  }

  // 3. Check RBAC role hierarchy
  if (!hasMinimumRole(context.role, requiredRole)) {
    return {
      authorized: false,
      response: typeof Response !== 'undefined'
        ? Response.json(
            { error: `Accès refusé. Rôle ${requiredRole} requis (actuel: ${context.role}).` },
            { status: 403 }
          )
        : {
            error: `Accès refusé. Rôle ${requiredRole} requis (actuel: ${context.role}).`,
            status: 403,
          },
    };
  }

  return { authorized: true, response: null };
}

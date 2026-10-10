'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAcceptInvitation } from '@/hooks/use-teams';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const acceptMutation = useAcceptInvitation();

  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError("Token d'invitation manquant dans le lien.");
        setLoading(false);
        return;
      }

      // Check current session
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const authData = await authRes.json();
          setCurrentUser(authData.user);
        }
      } catch (_) {}

      // Validate invitation token
      try {
        const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || "Cette invitation est invalide ou a expiré.");
        } else {
          setInvitation(data.invitation);
        }
      } catch (err) {
        setError("Erreur lors de la vérification de l'invitation.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(token);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message || "Échec de l'acceptation de l'invitation.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto text-3xl font-bold">
          ✉️
        </div>

        {error ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-white">Invitation Invalide</h1>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
            <Link
              href="/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-white mb-2">Rejoindre l'équipe</h1>
              <p className="text-sm text-slate-300">
                <strong className="text-white">{invitation?.invitedBy?.name || 'Un administrateur'}</strong> vous invite à rejoindre l'équipe{' '}
                <strong className="text-indigo-400">{invitation?.team?.name}</strong> avec le rôle{' '}
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-xs text-slate-200">
                  {invitation?.role}
                </span>.
              </p>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 text-left">
                  Connecté en tant que <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.email}).
                </div>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {acceptMutation.isPending ? 'Acceptation...' : 'Accepter et rejoindre l’équipe'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Vous devez posséder un compte pour rejoindre cette équipe.
                </p>
                <Link
                  href={`/register?invitationToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation?.email || '')}`}
                  className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Créer un compte
                </Link>
                <Link
                  href={`/login`}
                  className="block w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-sm transition-colors"
                >
                  Déjà un compte ? Se connecter
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}

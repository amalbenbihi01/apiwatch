'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { useTeams } from '@/hooks/use-teams';

function getRoleBadge(role) {
  const normalized = role?.toUpperCase?.() || role;
  switch (normalized) {
    case 'OWNER':
      return (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Owner
        </span>
      );
    case 'ADMIN':
      return (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Admin
        </span>
      );
    case 'MEMBER':
      return (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Membre
        </span>
      );
    case 'VIEWER':
      return (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
          Lecteur
        </span>
      );
    default:
      return role ? (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
          {role}
        </span>
      ) : null;
  }
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const retryButtonRef = useRef(null);

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: teamsData } = useTeams();
  const logoutMutation = useLogout();

  const teams = teamsData?.teams || [];
  const activeTeamId = teamsData?.activeTeamId;
  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];
  const activeRole = teamsData?.activeRole || activeTeam?.role;

  // Fermeture du dropdown au clic extérieur et touche Échap
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (logoutMutation.isError) {
          logoutMutation.reset();
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen || logoutMutation.isError) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, logoutMutation]);

  // Focus automatique sur le bouton Réessayer à l'ouverture de la modale d'alerte
  useEffect(() => {
    if (logoutMutation.isError && retryButtonRef.current) {
      retryButtonRef.current.focus();
    }
  }, [logoutMutation.isError]);

  if (isUserLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 animate-pulse">
        <div className="w-6 h-6 rounded-full bg-slate-700 shrink-0"></div>
        <div className="w-16 h-3 rounded bg-slate-700 hidden sm:block"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
      >
        Connexion
      </Link>
    );
  }

  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  const handleStartLogout = () => {
    setIsOpen(false);
    logoutMutation.mutate();
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Menu utilisateur"
          className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 transition-all text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-inner shrink-0">
            {initial}
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-200 max-w-[130px] truncate">
            {user.name}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* En-tête profil */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-inner shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {activeTeam && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate max-w-[120px]">
                    {activeTeam.name}
                  </span>
                  <div>{getRoleBadge(activeRole)}</div>
                </div>
              )}
            </div>

            {/* Actions & Raccourcis */}
            <div className="p-1.5 space-y-0.5">
              <Link
                href="/dashboard/team"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>Gestion de l’équipe</span>
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <span>Tableau de bord</span>
              </Link>
            </div>

            {/* Déconnexion */}
            <div className="p-1.5 border-t border-slate-800 bg-slate-950/30">
              <button
                type="button"
                disabled={logoutMutation.isPending}
                onClick={handleStartLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>{logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale d'alerte et de sécurité en cas d'échec de déconnexion */}
      {logoutMutation.isError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="logout-error-title"
          aria-describedby="logout-error-desc"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg shrink-0">
                ⚠️
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="logout-error-title" className="text-base font-bold text-white">
                  Déconnexion non confirmée
                </h3>
                <p id="logout-error-desc" className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {logoutMutation.error?.message ||
                    'Le serveur n’a pas pu confirmer la suppression de votre session (erreur réseau ou serveur).'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed space-y-1">
              <p className="font-semibold text-amber-300">Statut de sécurité :</p>
              <p>
                Votre session et vos accès restent potentiellement actifs sur cet appareil.
                Vos données locales ne sont pas supprimées tant que la déconnexion n’est pas confirmée par le serveur.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => logoutMutation.reset()}
                disabled={logoutMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                Annuler et rester connecté
              </button>
              <button
                type="button"
                ref={retryButtonRef}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {logoutMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Nouvelle tentative...</span>
                  </>
                ) : (
                  <span>Réessayer la déconnexion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLogout } from '@/hooks/use-auth';

export default function LandingNavbar({ isAuthenticated = false }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logoutMutation = useLogout();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: 'Fonctionnalités', href: '#fonctionnalites' },
    { name: 'Aperçu', href: '#apercu' },
    { name: 'Fonctionnement', href: '#fonctionnement' },
    { name: 'Page de Statut', href: '#status-page' },
  ];

  const handleSwitchAccount = () => {
    setIsMobileMenuOpen(false);
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo APIWatch */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
              aria-label="Accueil APIWatch"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className="font-bold text-lg text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                APIWatch
              </span>
            </Link>
          </div>

          {/* Navigation desktop par ancres */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Boutons d'action desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={logoutMutation.isPending}
                  className="text-slate-400 hover:text-slate-200 text-sm font-medium px-3 py-2 rounded-xl transition-colors hover:bg-slate-800 disabled:opacity-50"
                  title="Se déconnecter pour changer de compte"
                >
                  {logoutMutation.isPending ? 'Déconnexion...' : 'Changer de compte'}
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <span>Accéder au Dashboard</span>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-300 hover:text-white font-medium px-3.5 py-2 rounded-xl text-sm transition-colors hover:bg-slate-800"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <span>Créer un compte</span>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}
          </div>

          {/* Bouton burger mobile */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Menu principal"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/98 px-4 pt-3 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Accéder au Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={logoutMutation.isPending}
                  className="w-full text-center bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-700 disabled:opacity-50"
                >
                  {logoutMutation.isPending ? 'Déconnexion...' : 'Changer de compte'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center bg-slate-800 hover:bg-slate-750 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-700"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TeamSwitcher from '@/components/team/TeamSwitcher';
import NotificationBell from '@/components/api-monitoring/NotificationBell';
import UserDropdown from '@/components/UserDropdown';

export default function AppHeader() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const [prevPathname, setPrevPathname] = useState(pathname);

  // Fermer le menu mobile lors d'un changement d'URL (pattern React recommandé sans effet en cascade)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Fermer le menu mobile avec Échap ou clic externe
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Définition des onglets de navigation centralisés
  const navTabs = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      isActive: pathname === '/dashboard' || pathname.startsWith('/dashboard/apis'),
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      name: 'Logs',
      href: '/dashboard/logs',
      isActive: pathname.startsWith('/dashboard/logs'),
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      name: 'Status Page',
      href: '/dashboard/status-page',
      isActive: pathname.startsWith('/dashboard/status-page'),
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Équipe',
      href: '/dashboard/team',
      isActive: pathname.startsWith('/dashboard/team'),
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Section Gauche : Logo APIWatch uniquement */}
          <div className="flex items-center shrink-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
              aria-label="Accueil APIWatch"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className="font-bold text-lg text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                APIWatch
              </span>
            </Link>
          </div>

          {/* Section Centre : Navigation Desktop (4 onglets) */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center space-x-1 lg:space-x-1.5"
          >
            {navTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  tab.isActive
                    ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </Link>
            ))}
          </nav>

          {/* Section Droite : TeamSwitcher (desktop) + NotificationBell + UserDropdown (desktop) + Hamburger (mobile) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden md:block">
              <TeamSwitcher />
            </div>

            <NotificationBell />

            <div className="hidden md:block">
              <UserDropdown />
            </div>

            {/* Bouton Hamburger Mobile (< md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Ouvrir le menu de navigation"
              className="md:hidden p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile / Drawer responsive (< md) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            ref={mobileMenuRef}
            className="bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-4 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* TeamSwitcher sur mobile */}
            <div className="pb-3 border-b border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Équipe active
              </p>
              <TeamSwitcher />
            </div>

            {/* Liens de navigation verticaux */}
            <nav className="space-y-1" aria-label="Navigation mobile">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 py-1">
                Navigation
              </p>
              {navTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                    tab.isActive
                      ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className={tab.isActive ? 'text-indigo-400' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span>{tab.name}</span>
                </Link>
              ))}
            </nav>

            {/* Profil utilisateur sur mobile */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Compte & Profil
              </p>
              <UserDropdown />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

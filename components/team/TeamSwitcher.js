'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTeams, useSwitchTeam, useCreateTeam } from '@/hooks/use-teams';

export default function TeamSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const dropdownRef = useRef(null);

  const { data: teamsData, isLoading } = useTeams();
  const switchTeamMutation = useSwitchTeam();
  const createTeamMutation = useCreateTeam();

  const teams = teamsData?.teams || [];
  const activeTeamId = teamsData?.activeTeamId;
  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (teamId) => {
    if (teamId === activeTeamId) {
      setIsOpen(false);
      return;
    }
    try {
      await switchTeamMutation.mutateAsync(teamId);
      setIsOpen(false);
    } catch (err) {
      console.error('Erreur switch team:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await createTeamMutation.mutateAsync({ name: newTeamName.trim() });
      setNewTeamName('');
      setShowCreateModal(false);
      setIsOpen(false);
    } catch (err) {
      console.error('Erreur création team:', err);
    }
  };

  const getRoleBadge = (role) => {
    const normalized = role?.toUpperCase?.() || role;
    switch (normalized) {
      case 'OWNER':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Owner</span>;
      case 'ADMIN':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Admin</span>;
      case 'MEMBER':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Membre</span>;
      case 'VIEWER':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">Lecteur</span>;
      default:
        return role ? (
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
            {role}
          </span>
        ) : null;
    }
  };

  if (isLoading || !activeTeam) {
    return (
      <div className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs animate-pulse">
        <div className="w-5 h-5 rounded bg-slate-700"></div>
        <span className="hidden sm:inline">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 transition-all text-xs sm:text-sm font-medium text-slate-200"
        title={`Équipe active : ${activeTeam.name}`}
      >
        <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
          {activeTeam.name.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[100px] sm:max-w-[120px] truncate">{activeTeam.name}</span>
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
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 border-b border-slate-800 bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mes Équipes</p>
          </div>

          <div className="max-h-60 overflow-y-auto py-1.5 space-y-0.5">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwitch(t.id)}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-800/70 transition-colors ${
                  t.id === activeTeam.id ? 'bg-slate-800/50 text-indigo-300' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                      t.id === activeTeam.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.membersCount} membre{t.membersCount > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {getRoleBadge(t.role)}
                  {t.id === activeTeam.id && (
                    <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-slate-800 bg-slate-950/40 space-y-1">
            <Link
              href="/dashboard/team"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gérer l&apos;équipe ({activeTeam.name})
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Créer une nouvelle équipe
            </button>
          </div>
        </div>
      )}

      {/* Modal Création Team */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Créer une nouvelle équipe</h3>
            <p className="text-sm text-slate-400 mb-4">
              Donnez un nom à votre équipe pour collaborer avec d&apos;autres développeurs sur vos monitors d&apos;API.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom de l&apos;équipe</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Équipe Production, DevOps Core..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createTeamMutation.isPending || !newTeamName.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {createTeamMutation.isPending ? 'Création...' : 'Créer l’équipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

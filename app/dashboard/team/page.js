'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTeams,
  useTeamDetails,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateTeam,
  useTransferOwnership,
  useDeleteTeam,
} from '@/hooks/use-teams';
import TeamSwitcher from '@/components/team/TeamSwitcher';

export default function TeamManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  const { data: teamsData, isLoading: isLoadingTeams } = useTeams();
  const activeTeamId = teamsData?.activeTeamId;
  const { data: team, isLoading: isLoadingTeam, error: teamError } = useTeamDetails(activeTeamId);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  const [renameName, setRenameName] = useState('');
  const [renameSuccess, setRenameSuccess] = useState('');
  const [renameError, setRenameError] = useState('');

  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [transferError, setTransferError] = useState('');

  const [deleteError, setDeleteError] = useState('');

  // Mutations
  const inviteMutation = useInviteMember(activeTeamId);
  const updateRoleMutation = useUpdateMemberRole(activeTeamId);
  const removeMemberMutation = useRemoveMember(activeTeamId);
  const revokeInvitationMutation = useRevokeInvitation(activeTeamId);
  const updateTeamMutation = useUpdateTeam(activeTeamId);
  const transferOwnershipMutation = useTransferOwnership(activeTeamId);
  const deleteTeamMutation = useDeleteTeam(activeTeamId);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      } catch (_) {
        router.push('/login');
      }
    }
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (team?.name) {
      setRenameName(team.name);
    }
  }, [team?.name]);

  if (isLoadingTeams || isLoadingTeam) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">Aucune équipe active sélectionnée</h2>
        <Link href="/dashboard" className="text-indigo-400 hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // Find user's current membership & role in this team
  const currentMember = team.members?.find((m) => m.userId === currentUser?.id);
  const currentRole = currentMember?.role || 'VIEWER';
  const isOwner = currentRole === 'OWNER';
  const isAdmin = currentRole === 'ADMIN' || isOwner;

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    try {
      await inviteMutation.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteSuccess(`Invitation envoyée avec succès à ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('MEMBER');
    } catch (err) {
      setInviteError(err.message || 'Erreur lors de l’envoi de l’invitation');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({ memberId, role: newRole });
    } catch (err) {
      alert(err.message || 'Erreur lors du changement de rôle');
    }
  };

  const handleRemoveMember = async (memberId, isSelf) => {
    const confirmMsg = isSelf
      ? "Êtes-vous sûr de vouloir quitter cette équipe ?"
      : "Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await removeMemberMutation.mutateAsync(memberId);
      if (isSelf) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression du membre');
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir révoquer cette invitation ?")) return;
    try {
      await revokeInvitationMutation.mutateAsync(invitationId);
    } catch (err) {
      alert(err.message || 'Erreur lors de la révocation');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    setRenameError('');
    setRenameSuccess('');
    try {
      await updateTeamMutation.mutateAsync({ name: renameName });
      setRenameSuccess("Nom de l'équipe mis à jour avec succès.");
    } catch (err) {
      setRenameError(err.message || 'Erreur lors du renommage');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');
    if (!selectedNewOwner) {
      setTransferError('Veuillez sélectionner un membre');
      return;
    }

    if (
      !window.confirm(
        'Attention : Vous allez transférer la propriété de cette équipe. Vous deviendrez Administrateur. Confirmer ?'
      )
    ) {
      return;
    }

    try {
      await transferOwnershipMutation.mutateAsync(selectedNewOwner);
      setTransferSuccess('Propriété transférée avec succès.');
      setSelectedNewOwner('');
    } catch (err) {
      setTransferError(err.message || 'Erreur lors du transfert de propriété');
    }
  };

  const handleDeleteTeam = async () => {
    setDeleteError('');
    if (
      !window.confirm(
        `Êtes-vous absolument sûr de vouloir supprimer définitivement l'équipe "${team.name}" ?`
      )
    ) {
      return;
    }

    try {
      await deleteTeamMutation.mutateAsync();
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setDeleteError(err.message || "Erreur lors de la suppression de l'équipe");
    }
  };

  const getRoleBadge = (role) => {
    const normalized = role?.toUpperCase?.() || role;
    switch (normalized) {
      case 'OWNER':
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">Owner</span>;
      case 'ADMIN':
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">Admin</span>;
      case 'MEMBER':
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Membre</span>;
      case 'VIEWER':
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/40">Lecteur</span>;
      default:
        return role ? (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/40">
            {role}
          </span>
        ) : null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-semibold">Tableau de bord</span>
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2">
              <TeamSwitcher />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Connecté en tant que <strong className="text-slate-200">{currentUser?.name}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-400">
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                {getRoleBadge(currentRole)}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {team.members?.length || 0} collaborateur{(team.members?.length || 0) > 1 ? 's' : ''} • {team._count?.endpoints || 0} monitor{(team._count?.endpoints || 0) > 1 ? 's' : ''} actif{(team._count?.endpoints || 0) > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sm font-medium text-slate-200 transition-all"
            >
              Voir les monitors de l'équipe
            </Link>
          </div>
        </div>

        {/* Grid: Members & Invitations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 cols): Members List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Membres de l'équipe</h2>
                  <p className="text-xs text-slate-400">Gérez les accès et les permissions des collaborateurs</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {team.members?.length || 0} membres
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {team.members?.map((m) => {
                  const isSelf = m.userId === currentUser?.id;
                  const canEditRole = isOwner && m.role !== 'OWNER';
                  const canRemove =
                    (isOwner && m.role !== 'OWNER') ||
                    (isAdmin && !isOwner && m.role !== 'OWNER' && m.role !== 'ADMIN') ||
                    isSelf;

                  return (
                    <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm shrink-0">
                          {m.user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">
                              {m.user.name} {isSelf && <span className="text-xs text-indigo-400 font-normal">(Vous)</span>}
                            </p>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{m.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {canEditRole ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value)}
                            disabled={updateRoleMutation.isPending}
                            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Membre</option>
                            <option value="VIEWER">Lecteur</option>
                          </select>
                        ) : (
                          getRoleBadge(m.role)
                        )}

                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, isSelf)}
                            disabled={removeMemberMutation.isPending}
                            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                              isSelf
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                          >
                            {isSelf ? 'Quitter' : 'Retirer'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Invitations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-md font-bold text-white">Invitations en attente</h3>
                <span className="text-xs text-slate-400">{team.invitations?.length || 0} en attente</span>
              </div>

              {team.invitations && team.invitations.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {team.invitations.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-200 truncate">{inv.email}</p>
                        <p className="text-xs text-slate-400">
                          Rôle : <span className="text-slate-300 font-medium">{inv.role}</span> • Expire le {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv.id)}
                          disabled={revokeInvitationMutation.isPending}
                          className="text-xs px-2.5 py-1 rounded-md text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                        >
                          Révoquer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">Aucune invitation en attente pour cette équipe.</p>
              )}
            </div>
          </div>

          {/* Right Column (1 col): Invite Form & Settings */}
          <div className="space-y-6">
            {/* Invite Form */}
            {isAdmin && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-md font-bold text-white">Inviter un collaborateur</h3>
                <p className="text-xs text-slate-400">
                  Envoyez une invitation par email avec un lien d'accès sécurisé valide 7 jours.
                </p>

                {inviteSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    {inviteSuccess}
                  </div>
                )}
                {inviteError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleInvite} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="collegue@entreprise.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Rôle</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="MEMBER">Membre (CRUD Monitors, Tests)</option>
                      <option value="VIEWER">Lecteur (Lecture seule)</option>
                      {isOwner && <option value="ADMIN">Admin (Gestion des membres et monitors)</option>}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={inviteMutation.isPending || !inviteEmail.trim()}
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? 'Envoi...' : 'Envoyer l’invitation'}
                  </button>
                </form>
              </div>
            )}

            {/* Team Settings (Owner only) */}
            {isOwner && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3">Paramètres de l'équipe</h3>

                {/* Rename */}
                <form onSubmit={handleRename} className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">Renommer l'équipe</label>
                  {renameSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      {renameSuccess}
                    </div>
                  )}
                  {renameError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {renameError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={updateTeamMutation.isPending || !renameName.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-medium text-white transition-colors"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>

                {/* Ownership Transfer */}
                <form onSubmit={handleTransfer} className="space-y-3 border-t border-slate-800 pt-4">
                  <label className="block text-xs font-medium text-slate-300">Transférer la propriété</label>
                  <p className="text-[11px] text-slate-400">
                    Désignez un autre membre comme propriétaire. Vous conserverez le rôle d'Administrateur.
                  </p>
                  {transferSuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                      {transferSuccess}
                    </div>
                  )}
                  {transferError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {transferError}
                    </div>
                  )}
                  <select
                    value={selectedNewOwner}
                    onChange={(e) => setSelectedNewOwner(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sélectionner un nouveau propriétaire...</option>
                    {team.members
                      ?.filter((m) => m.userId !== currentUser?.id)
                      .map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name} ({m.user.email}) - {m.role}
                        </option>
                      ))}
                  </select>
                  <button
                    type="submit"
                    disabled={transferOwnershipMutation.isPending || !selectedNewOwner}
                    className="w-full py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    Transférer la propriété
                  </button>
                </form>

                {/* Danger Zone: Delete Team */}
                <div className="border-t border-rose-950/40 pt-4 space-y-2">
                  <p className="text-xs font-bold text-rose-400">Zone de danger</p>
                  <p className="text-[11px] text-slate-400">
                    Une équipe ne peut être supprimée que si elle ne contient plus aucun monitor d'API.
                  </p>
                  {deleteError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {deleteError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleDeleteTeam}
                    disabled={deleteTeamMutation.isPending}
                    className="w-full py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    Supprimer l'équipe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

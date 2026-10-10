'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des équipes');
      }
      return await res.json();
    },
  });
}

export function useTeamDetails(teamId) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des détails de l’équipe');
      }
      const data = await res.json();
      const team = data.team;
      if (!team) return null;
      return {
        ...team,
        members: Array.isArray(team.members)
          ? team.members.map((member) => ({
              ...member,
              role: member.role,
            }))
          : [],
      };
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamData) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la création de l’équipe');
      }
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['apis'] });
      queryClient.invalidateQueries({ queryKey: ['globalAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useSwitchTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId) => {
      const res = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec du changement d’équipe');
      }
      return data.activeTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useUpdateTeam(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la mise à jour de l’équipe');
      }
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useDeleteTeam(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la suppression de l’équipe');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useTransferOwnership(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwnerId) => {
      const res = await fetch(`/api/teams/${teamId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec du transfert de propriété');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useInviteMember(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }) => {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l’envoi de l’invitation');
      }
      return data.invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useUpdateMemberRole(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }) => {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la modification du rôle');
      }
      return data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useRemoveMember(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId) => {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la suppression du membre');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRevokeInvitation(teamId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId) => {
      const res = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la révocation de l’invitation');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token) => {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l’acceptation de l’invitation');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

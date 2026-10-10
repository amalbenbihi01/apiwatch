'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useDashboardPreferences() {
  return useQuery({
    queryKey: ['dashboard-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/preferences');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des préférences');
      }
      const data = await res.json();
      return data;
    },
  });
}

export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configData) => {
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l’enregistrement des préférences');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
    },
  });
}

export function useResetDashboardPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/preferences/reset', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la réinitialisation');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-preferences'] });
    },
  });
}

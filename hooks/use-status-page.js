'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook pour récupérer la configuration privée de la page de statut (Dashboard)
 */
export function useStatusPageConfig() {
  return useQuery({
    queryKey: ['status-page-config'],
    queryFn: async () => {
      const res = await fetch('/api/status-page/config');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la récupération de la configuration');
      }
      return res.json();
    },
  });
}

/**
 * Hook pour mettre à jour la configuration privée de la page de statut
 */
export function useUpdateStatusPageConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedData) => {
      const res = await fetch('/api/status-page/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.error || 'Échec de la mise à jour de la configuration';
        const err = new Error(errorMsg);
        err.status = res.status;
        throw err;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-page-config'] });
    },
  });
}

/**
 * Hook pour la page publique de statut (Quasi temps réel : rafraîchissement auto toutes les 30s)
 */
export function usePublicStatusPage(slug) {
  return useQuery({
    queryKey: ['public-status-page', slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await fetch(`/api/status/public/${encodeURIComponent(slug)}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(errorData.error || 'Status page not found');
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    enabled: !!slug,
    refetchInterval: 30000, // Rafraîchissement automatique quasi temps réel toutes les 30 secondes
    staleTime: 10000,      // Considéré à jour pendant 10 secondes
  });
}

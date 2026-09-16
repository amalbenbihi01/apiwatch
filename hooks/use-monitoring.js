'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useLatestCheck(endpointId) {
  return useQuery({
    queryKey: ['api-checks', endpointId, 'latest'],
    queryFn: async () => {
      if (!endpointId) return null;
      const res = await fetch(`/api/endpoints/${endpointId}/checks/latest`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer le dernier contrôlé');
      }
      const data = await res.json();
      return data.check;
    },
    enabled: !!endpointId,
  });
}

export function useApiChecks(endpointId) {
  return useQuery({
    queryKey: ['api-checks', endpointId],
    queryFn: async () => {
      if (!endpointId) return [];
      const res = await fetch(`/api/endpoints/${endpointId}/checks`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer l’historique');
      }
      const data = await res.json();
      return data.checks;
    },
    enabled: !!endpointId,
  });
}

export function useRunCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endpointId) => {
      const res = await fetch(`/api/endpoints/${endpointId}/check`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l’exécution du health check');
      }
      return data.check;
    },
    onSuccess: (check, endpointId) => {
      queryClient.invalidateQueries({ queryKey: ['api-checks', endpointId, 'latest'] });
      queryClient.invalidateQueries({ queryKey: ['api-checks', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['apis', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['apis'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['endpoint-incidents', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['endpoint-analytics', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['global-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    },
  });
}

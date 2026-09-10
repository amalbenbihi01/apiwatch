'use client';

import { useQuery } from '@tanstack/react-query';

export function useIncidents(statusFilter = null) {
  return useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: async () => {
      const url = statusFilter ? `/api/incidents?status=${statusFilter}` : '/api/incidents';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les incidents');
      }
      const data = await res.json();
      return data.incidents;
    },
  });
}

export function useEndpointIncidents(endpointId) {
  return useQuery({
    queryKey: ['endpoint-incidents', endpointId],
    queryFn: async () => {
      if (!endpointId) return [];
      const res = await fetch(`/api/endpoints/${endpointId}/incidents`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les incidents de l’API');
      }
      const data = await res.json();
      return data.incidents;
    },
    enabled: !!endpointId,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';

export function useEndpointAnalytics(endpointId, period = '24h') {
  return useQuery({
    queryKey: ['endpoint-analytics', endpointId, period],
    queryFn: async () => {
      if (!endpointId) return null;
      const res = await fetch(`/api/endpoints/${endpointId}/analytics?period=${period}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les analytics');
      }
      const data = await res.json();
      return data.analytics;
    },
    enabled: !!endpointId,
  });
}

export function useGlobalAnalytics() {
  return useQuery({
    queryKey: ['global-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/global');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les métriques globales');
      }
      const data = await res.json();
      return data.globalAnalytics;
    },
  });
}

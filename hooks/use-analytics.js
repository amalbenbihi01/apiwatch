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

export function useGlobalActivity(limit = 10) {
  return useQuery({
    queryKey: ['global-activity', limit],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/global/activity?limit=${limit}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de charger l’activité');
      }
      const data = await res.json();
      return data.activity || [];
    },
  });
}

export function useGlobalResponseTimeSeries(period = '24h') {
  return useQuery({
    queryKey: ['global-series', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/global/series?period=${period}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de charger la série temporelle');
      }
      const data = await res.json();
      return data;
    },
  });
}

export function useAdvancedAnalytics({ endpointId, period = '24h' } = {}) {
  return useQuery({
    queryKey: ['advanced-analytics', endpointId || 'all', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (endpointId && endpointId !== 'all') params.set('endpointId', endpointId);
      if (period) params.set('period', period);

      const res = await fetch(`/api/analytics/advanced?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de charger les analyses avancées');
      }
      const data = await res.json();
      return data.analytics;
    },
  });
}

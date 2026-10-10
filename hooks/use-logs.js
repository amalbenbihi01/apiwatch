'use client';

import { useQuery } from '@tanstack/react-query';

export function useLogs({
  endpointId,
  status,
  httpCode,
  search,
  period,
  page = 1,
  limit = 20,
} = {}) {
  const queryParams = new URLSearchParams();
  if (endpointId && endpointId !== 'all') queryParams.set('endpointId', endpointId);
  if (status && status !== 'all') queryParams.set('status', status);
  if (httpCode && httpCode !== 'all') queryParams.set('httpCode', httpCode);
  if (search && search.trim()) queryParams.set('search', search.trim());
  if (period && period !== 'all') queryParams.set('period', period);
  if (page) queryParams.set('page', String(page));
  if (limit) queryParams.set('limit', String(limit));

  return useQuery({
    queryKey: ['logs', endpointId || 'all', status || 'all', httpCode || 'all', search || '', period || 'all', page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/logs?${queryParams.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les logs');
      }
      return await res.json();
    },
    keepPreviousData: true,
  });
}

export function useLogDetail(checkId) {
  return useQuery({
    queryKey: ['log-detail', checkId],
    queryFn: async () => {
      if (!checkId) return null;
      const res = await fetch(`/api/logs/${checkId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer le détail du log');
      }
      const data = await res.json();
      return data.check;
    },
    enabled: !!checkId,
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useApis() {
  return useQuery({
    queryKey: ['apis'],
    queryFn: async () => {
      const res = await fetch('/api/endpoints');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du chargement des APIs');
      }
      const data = await res.json();
      return data.endpoints;
    },
  });
}

export function useApi(id) {
  return useQuery({
    queryKey: ['apis', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/endpoints/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'API introuvable');
      }
      const data = await res.json();
      return data.endpoint;
    },
    enabled: !!id,
  });
}

export function useCreateApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newApiData) => {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApiData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la création');
      }
      return data.endpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apis'] });
    },
  });
}

export function useUpdateApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const res = await fetch(`/api/endpoints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la mise à jour');
      }
      return data.endpoint;
    },
    onSuccess: (updatedEndpoint) => {
      queryClient.invalidateQueries({ queryKey: ['apis'] });
      queryClient.invalidateQueries({ queryKey: ['apis', updatedEndpoint.id] });
    },
  });
}

export function useDeleteApi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de la suppression');
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apis'] });
    },
  });
}

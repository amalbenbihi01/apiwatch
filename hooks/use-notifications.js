'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotificationLogs() {
  return useQuery({
    queryKey: ['notification-logs'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer le journal des notifications');
      }
      const data = await res.json();
      return data.logs;
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/preferences');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les préférences');
      }
      const data = await res.json();
      return data.preferences;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailNotificationsEnabled }) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailNotificationsEnabled }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la mise à jour des préférences');
      }
      return data.preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

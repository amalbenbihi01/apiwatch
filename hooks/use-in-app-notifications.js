'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unread-notification-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/in-app/unread-count');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer le compteur');
      }
      const data = await res.json();
      return data.unreadCount;
    },
    refetchInterval: 10000,              // Rafraîchissement automatique toutes les 10s
    refetchIntervalInBackground: false, // Pause automatique si l'onglet est masqué
    refetchOnWindowFocus: true,          // Rafraîchissement immédiat au retour sur la page
    staleTime: 5000,
  });
}

export function useInAppNotifications({ page = 1, limit = 10, unreadOnly = false } = {}) {
  return useQuery({
    queryKey: ['in-app-notifications', page, limit, unreadOnly],
    queryFn: async () => {
      const statusParam = unreadOnly ? '&status=unread' : '';
      const res = await fetch(`/api/notifications/in-app?page=${page}&limit=${limit}${statusParam}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Impossible de récupérer les notifications');
      }
      return await res.json();
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId) => {
      const res = await fetch(`/api/notifications/in-app/${notificationId}/read`, {
        method: 'PATCH',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec du marquage comme lu');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/in-app/read-all', {
        method: 'PATCH',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec du marquage global comme lu');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    },
  });
}

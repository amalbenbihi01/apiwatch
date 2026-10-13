'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

/**
 * Hook de récupération de l'utilisateur actuellement authentifié.
 * - Cache géré par React Query (staleTime: 5 minutes).
 * - Transmet signal pour permettre l'annulation réseau native via cancelQueries().
 * - Traite HTTP 401 comme une absence de session (retourne null).
 * - Laisse remonter les erreurs réseau et erreurs HTTP non-401 sans les masquer en null.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async ({ signal }) => {
      let res;
      try {
        res = await fetch('/api/auth/me', { signal });
      } catch (networkError) {
        if (networkError.name === 'AbortError') {
          throw networkError;
        }
        const err = new Error(
          networkError.message || 'Erreur réseau lors de la vérification de session'
        );
        err.name = 'AuthNetworkError';
        err.isNetworkError = true;
        throw err;
      }

      if (res.status === 401) {
        // Absence de session confirmée (non authentifié)
        return null;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(
          errorData.error || 'Erreur serveur lors de la vérification de session'
        );
        err.name = 'AuthServerError';
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      return data?.user || null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook de déconnexion sécurisée.
 *
 * 1. Succès confirmé (HTTP 200 et success: true vérifiés) :
 *    - Le cookie de session apiwatch_session a été révoqué par le serveur (Max-Age: 0).
 *    - Annulation des requêtes en cours.
 *    - Purge intégrale du cache React Query (clear).
 *    - Redirection vers /login et rafraîchissement du routeur.
 *
 * 2. Échec HTTP ou coupure réseau :
 *    - Le serveur n'a pas confirmé l'invalidation du cookie (serverSessionRevoked: false).
 *    - Pas de redirection aveugle vers /login (évite le rebond du middleware).
 *    - Pas d'altération globale des options du QueryClient (pas de setDefaultOptions).
 *    - Pas d'affirmation que l'utilisateur est déconnecté.
 *    - Propagation d'une erreur descriptive pour affichage et nouvelle tentative dans l'UI.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      let res;
      try {
        res = await fetch('/api/auth/logout', {
          method: 'POST',
        });
      } catch (networkError) {
        const err = new Error(
          networkError.message || 'Coupure réseau lors de la déconnexion. Impossible de contacter le serveur.'
        );
        err.name = 'LogoutNetworkError';
        err.serverSessionRevoked = false;
        err.isNetworkError = true;
        throw err;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(
          errorData.error || 'Le serveur a renvoyé une erreur HTTP lors de la tentative de déconnexion.'
        );
        err.name = 'LogoutServerError';
        err.status = res.status;
        err.serverSessionRevoked = false;
        throw err;
      }

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // Validation stricte du contrat serveur de /api/auth/logout
      if (!data || data.success !== true) {
        const err = new Error(
          data?.error || 'Réponse serveur invalide : la suppression du cookie de session n’a pas été confirmée.'
        );
        err.name = 'LogoutContractError';
        err.serverSessionRevoked = false;
        throw err;
      }

      return { success: true, serverSessionRevoked: true };
    },
    onSuccess: async () => {
      // Déconnexion confirmée par le serveur
      await queryClient.cancelQueries();
      queryClient.clear();
      router.push('/login');
      router.refresh();
    },
    // En cas d'erreur, pas de setDefaultOptions ni de setQueryData factice.
    // L'erreur est disponible sur logoutMutation pour traitement par le composant.
  });
}

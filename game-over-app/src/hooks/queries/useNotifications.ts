/**
 * Notifications Query Hooks
 * React Query hooks for notifications
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { notificationsRepository } from '@/repositories';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  unreadCount: (userId: string) =>
    [...notificationKeys.all, 'unread', userId] as const,
};

/**
 * Fetch notifications with infinite scroll
 */
export function useNotifications() {
  const user = useAuthStore((state) => state.user);

  return useInfiniteQuery({
    queryKey: notificationKeys.list(user?.id || ''),
    queryFn: ({ pageParam = 0 }) =>
      notificationsRepository.getByUserId(user!.id, pageParam),
    enabled: !!user?.id,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get unread notifications count
 */
export function useUnreadNotificationsCount() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: () => notificationsRepository.getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Mark a notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsRepository.markAsRead(notificationId),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(user.id),
        });
      }
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: () => notificationsRepository.markAllAsRead(user!.id),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(user.id),
        });
      }
    },
  });
}

/**
 * Subscribe to realtime notifications
 */
export function useRealtimeNotifications(
  onNotification: (notification: Notification) => void
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = notificationsRepository.subscribeToNotifications(
      user.id,
      (notification) => {
        // Update unread count
        queryClient.setQueryData(
          notificationKeys.unreadCount(user.id),
          (old: number | undefined) => (old || 0) + 1
        );

        // Notify callback
        onNotification(notification);
      }
    );

    return unsubscribe;
  }, [user?.id, queryClient, onNotification]);
}

/**
 * Delete old notifications
 */
export function useDeleteOldNotifications() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (olderThanDays: number = 30) =>
      notificationsRepository.deleteOld(user!.id, olderThanDays),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(user.id),
        });
      }
    },
  });
}

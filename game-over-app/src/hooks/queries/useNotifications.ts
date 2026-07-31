/**
 * Notifications Query Hooks
 * React Query hooks for notifications
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';
import { notificationsRepository } from '@/repositories';
import { useAuthStore } from '@/stores/authStore';
import { useAppState } from '@/hooks/useAppState';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => [...notificationKeys.all, 'list', userId] as const,
  listWithOpsAccess: (userId: string, includeOpsAlerts: boolean) =>
    [...notificationKeys.list(userId), { includeOpsAlerts }] as const,
  unreadCount: (userId: string) =>
    [...notificationKeys.all, 'unread', userId] as const,
  unreadCountWithOpsAccess: (userId: string, includeOpsAlerts: boolean) =>
    [...notificationKeys.unreadCount(userId), { includeOpsAlerts }] as const,
  opsRecipient: (userId: string) =>
    [...notificationKeys.all, 'ops-recipient', userId] as const,
};

export function useOpsAlertRecipient() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: notificationKeys.opsRecipient(user?.id || ''),
    queryFn: () => notificationsRepository.isOpsAlertRecipient(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch notifications with infinite scroll
 */
export function useNotifications() {
  const user = useAuthStore((state) => state.user);
  const { data: includeOpsAlerts = false, isFetched: opsAccessResolved } = useOpsAlertRecipient();

  return useInfiniteQuery({
    queryKey: notificationKeys.listWithOpsAccess(user?.id || '', includeOpsAlerts),
    queryFn: ({ pageParam = 0 }) =>
      notificationsRepository.getByUserId(user!.id, pageParam, includeOpsAlerts),
    enabled: !!user?.id && opsAccessResolved,
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
  const appState = useAppState();
  const { data: includeOpsAlerts = false, isFetched: opsAccessResolved } = useOpsAlertRecipient();

  return useQuery({
    queryKey: notificationKeys.unreadCountWithOpsAccess(user?.id || '', includeOpsAlerts),
    queryFn: () => notificationsRepository.getUnreadCount(user!.id, includeOpsAlerts),
    enabled: !!user?.id && opsAccessResolved,
    refetchInterval: appState === 'active' ? 30000 : false,
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
 * Uses a ref for the callback to avoid subscription churn
 */
export function useRealtimeNotifications(
  onNotification: (notification: Notification) => void
) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { data: includeOpsAlerts = false, isFetched: opsAccessResolved } = useOpsAlertRecipient();
  // Use ref to store callback to avoid recreating subscription on callback change
  const onNotificationRef = useRef(onNotification);

  // Keep ref updated with latest callback
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!user?.id || !opsAccessResolved) return;

    const unsubscribe = notificationsRepository.subscribeToNotifications(
      user.id,
      (notification) => {
        if (notification.type === 'ops_cron_health' && !includeOpsAlerts) return;

        // Update unread count
        queryClient.setQueryData(
          notificationKeys.unreadCountWithOpsAccess(user.id, includeOpsAlerts),
          (old: number | undefined) => (old || 0) + 1
        );

        // Announce new notification to screen readers
        AccessibilityInfo.announceForAccessibility('New notification received');

        // Notify callback via ref (avoids stale closure)
        onNotificationRef.current(notification);
      }
    );

    return unsubscribe;
  }, [user?.id, queryClient, includeOpsAlerts, opsAccessResolved]);
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

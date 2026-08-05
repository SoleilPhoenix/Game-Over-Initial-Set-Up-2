/**
 * Notifications Repository
 * Data access layer for notifications
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type Event = Database['public']['Tables']['events']['Row'];

export type NotificationEventSummary = Pick<Event, 'status' | 'title' | 'honoree_name'>;
export type NotificationWithEvent = Notification & { event: NotificationEventSummary | null };

const PAGE_SIZE = 20;
const OPS_TYPE_LIKE_PATTERN = 'ops\\_%';

export function isOpsNotificationType(type: string): boolean {
  return type.startsWith('ops_');
}

export const notificationsRepository = {
  /**
   * Get notifications for a user with pagination
   */
  async getByUserId(
    userId: string,
    page: number = 0,
  ): Promise<{ notifications: NotificationWithEvent[]; hasMore: boolean }> {
    const from = page * PAGE_SIZE;
    // Over-fetch to compensate for client-side filtering of cancelled events
    const to = from + PAGE_SIZE * 2 - 1;

    const query = supabase
      .from('notifications')
      .select('*, event:events(status,title,honoree_name)')
      .eq('user_id', userId)
      .not('type', 'like', OPS_TYPE_LIKE_PATTERN)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error } = await query;

    if (error) throw error;

    // Hide notifications whose related event was cancelled (soft-deleted).
    // Notifications with no event_id (system-level) always pass through.
    const filtered = ((data || []) as NotificationWithEvent[]).filter(
      (notification) => !isOpsNotificationType(notification.type)
        && (!notification.event || notification.event.status !== 'cancelled'),
    );

    const notifications = filtered.slice(0, PAGE_SIZE);

    return {
      notifications,
      hasMore: filtered.length > PAGE_SIZE,
    };
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Fetch with event status to exclude cancelled-event notifications from badge count
    type Joined = Pick<Notification, 'type'> & { event: Pick<Event, 'status'> | null };
    const query = supabase
      .from('notifications')
      .select('type, event:events(status)')
      .eq('user_id', userId)
      .eq('is_read', false)
      .not('type', 'like', OPS_TYPE_LIKE_PATTERN);

    const { data, error } = await query;

    if (error) throw error;
    return ((data || []) as Joined[]).filter(
      (notification) => !isOpsNotificationType(notification.type)
        && (!notification.event || notification.event.status !== 'cancelled'),
    ).length;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Create a notification
   */
  async create(notification: NotificationInsert): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create notifications for multiple users
   */
  async createBulk(
    userIds: string[],
    notification: Omit<NotificationInsert, 'user_id'>
  ): Promise<void> {
    const notifications = userIds.map(userId => ({
      ...notification,
      user_id: userId,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) throw error;
  },

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOld(userId: string, olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
  },

  /**
   * Subscribe to new notifications (realtime)
   */
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ): () => void {
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          if (!isOpsNotificationType(notification.type)) {
            onNotification(notification);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
};

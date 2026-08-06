export interface ExpenseShareNotification {
  id: string;
  user_id: string;
  event_id: string | null;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
}

export function canNotifyExpenseShares(
  callerId: string,
  expenseCreatorId: string | null,
  organizerId: string,
): boolean {
  return callerId === expenseCreatorId || callerId === organizerId;
}

export function hasNotBeenPushed(notification: ExpenseShareNotification): boolean {
  return notification.metadata?.pushed !== true
    && notification.metadata?.pushed !== 'true';
}

export function markMetadataPushed(
  metadata: Record<string, unknown> | null,
): Record<string, unknown> {
  return { ...(metadata ?? {}), pushed: true };
}

/**
 * Send and then mark each row independently. A partially successful batch can
 * therefore retry only the rows that did not finish.
 */
export async function deliverPendingExpenseShareNotifications(
  loadNotifications: () => Promise<ExpenseShareNotification[]>,
  sendNotification: (notification: ExpenseShareNotification) => Promise<void>,
  markPushed: (notification: ExpenseShareNotification) => Promise<void>,
): Promise<number> {
  const notifications = (await loadNotifications()).filter(hasNotBeenPushed);

  for (const notification of notifications) {
    await sendNotification(notification);
    await markPushed(notification);
  }

  return notifications.length;
}

/**
 * Query Hooks Index
 * Central export for all React Query hooks
 */

// Events
export {
  useEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useUpdateEventPreferences,
  useDeleteEvent,
  useFilteredEvents,
  eventKeys,
} from './useEvents';

// Packages
export {
  usePackages,
  usePackage,
  useMatchedPackages,
  usePackageSearch,
  packageKeys,
} from './usePackages';

// Bookings
export {
  useBooking,
  useBookingById,
  useBookingCosts,
  useCreateBooking,
  useRequestRefund,
  bookingKeys,
} from './useBookings';

// Participants
export {
  useParticipants,
  useParticipantCount,
  useAddParticipant,
  useRemoveParticipant,
  useConfirmParticipation,
  useUpdateParticipantPayment,
  participantKeys,
} from './useParticipants';

// Chat
export {
  useChannels,
  useChannel,
  useMessages,
  useUnreadCount,
  useCreateChannel,
  useSendMessage,
  useMarkChannelAsRead,
  useRealtimeMessages,
  chatKeys,
} from './useChat';

// Polls
export {
  usePolls,
  usePoll,
  useActivePolls,
  useCreatePoll,
  useVote,
  useClosePoll,
  useUpdatePollStatus,
  useAddPollOption,
  pollKeys,
} from './usePolls';

// Notifications
export {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useRealtimeNotifications,
  useDeleteOldNotifications,
  notificationKeys,
} from './useNotifications';

// Cities
export {
  useCities,
  useCity,
  useCitySearch,
  cityKeys,
} from './useCities';

// Refunds
export {
  useEventRefunds,
  useCreateRefund,
  useImportRefunds,
  useUpdateRefund,
  useDeleteRefund,
  refundKeys,
} from './useRefunds';

// Extra costs
export {
  useEventExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useSetExpenseShares,
  useMarkOwnExpenseShareSettled,
  useReportExpense,
  useResolveExpenseReport,
  useMigrateLocalExpenses,
  useEventExpenseCategories,
  useCreateExpenseCategory,
  useRenameExpenseCategory,
  useDeleteExpenseCategory,
  expenseKeys,
} from './useExpenses';
export type {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  CreateEventExpense,
  CreateEventExpenseCategory,
  EventExpense,
  EventExpenseCategory,
  EventExpenseReport,
  EventExpenseShare,
  ExpenseShareInput,
  ReportEventExpense,
  ReportExpenseInput,
  UpdateEventExpense,
} from './useExpenses';

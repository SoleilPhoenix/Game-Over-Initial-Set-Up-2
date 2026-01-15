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
  useUpdatePaymentStatus,
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

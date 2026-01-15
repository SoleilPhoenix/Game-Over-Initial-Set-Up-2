/**
 * Calendar Utility
 * Add events to device calendar using expo-calendar
 */

import { Alert, Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

export interface CalendarEventData {
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  notes?: string;
  bookingReference?: string;
}

/**
 * Request calendar permissions
 * Returns true if granted, false otherwise
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Calendar.getCalendarPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Get or create a calendar for the app
 * Returns the calendar ID
 */
async function getOrCreateCalendar(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Try to find a writable calendar
  const writableCalendar = calendars.find(
    (cal) =>
      cal.allowsModifications &&
      (cal.source?.type === Calendar.SourceType.LOCAL ||
        cal.source?.type === Calendar.SourceType.CALDAV ||
        cal.isPrimary)
  );

  if (writableCalendar) {
    return writableCalendar.id;
  }

  // On iOS, try to create a new calendar
  if (Platform.OS === 'ios') {
    const defaultCalendarSource =
      calendars.find((cal) => cal.source?.type === Calendar.SourceType.LOCAL)?.source ||
      calendars.find((cal) => cal.source?.type === Calendar.SourceType.CALDAV)?.source;

    if (defaultCalendarSource) {
      try {
        const newCalendarId = await Calendar.createCalendarAsync({
          title: 'Game Over Events',
          color: '#258CF4',
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: defaultCalendarSource.id,
          source: defaultCalendarSource,
          name: 'Game Over',
          ownerAccount: 'personal',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
        return newCalendarId;
      } catch {
        // Fall back to any writable calendar
        return calendars.find((cal) => cal.allowsModifications)?.id || null;
      }
    }
  }

  // On Android, just use the first writable calendar
  return calendars.find((cal) => cal.allowsModifications)?.id || null;
}

/**
 * Add an event to the device calendar
 */
export async function addEventToCalendar(eventData: CalendarEventData): Promise<{
  success: boolean;
  eventId?: string;
  error?: string;
}> {
  try {
    // Check/request permissions
    const hasPermission = await requestCalendarPermissions();

    if (!hasPermission) {
      return {
        success: false,
        error: 'Calendar permission denied. Please enable it in your device settings.',
      };
    }

    // Get calendar to add event to
    const calendarId = await getOrCreateCalendar();

    if (!calendarId) {
      return {
        success: false,
        error: 'No writable calendar found on your device.',
      };
    }

    // Parse dates
    const startDate = new Date(eventData.startDate);
    const endDate = eventData.endDate
      ? new Date(eventData.endDate)
      : new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default to 1 day

    // Build notes with booking reference
    let notes = eventData.notes || '';
    if (eventData.bookingReference) {
      notes = `Booking Reference: ${eventData.bookingReference}\n\n${notes}`;
    }
    notes += '\n\nCreated by Game Over App';

    // Create the calendar event
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: eventData.title,
      startDate,
      endDate,
      location: eventData.location,
      notes: notes.trim(),
      allDay: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return { success: true, eventId };
  } catch (error) {
    console.error('Failed to add calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add event to calendar',
    };
  }
}

/**
 * Helper function to add event with user feedback
 */
export async function addEventToCalendarWithFeedback(eventData: CalendarEventData): Promise<void> {
  const result = await addEventToCalendar(eventData);

  if (result.success) {
    Alert.alert(
      'Added to Calendar',
      `"${eventData.title}" has been added to your calendar.`,
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert(
      'Calendar Error',
      result.error || 'Failed to add event to calendar. Please try again.',
      [{ text: 'OK' }]
    );
  }
}

/**
 * Check if expo-calendar is available
 */
export function isCalendarAvailable(): boolean {
  return !!Calendar;
}

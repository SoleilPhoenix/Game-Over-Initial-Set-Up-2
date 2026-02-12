/**
 * Calendar Utility
 * Add events to device calendar using expo-calendar
 * Uses write-only permission — does NOT read existing calendars.
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
 * Request calendar write permission.
 * On iOS 17+ this requests write-only access (not full calendar read).
 */
async function requestWritePermission(): Promise<boolean> {
  const { status: existing } = await Calendar.getCalendarPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the default calendar for new events.
 * Avoids getCalendarsAsync() which requires full calendar read access.
 */
async function getDefaultCalendarId(): Promise<string | null> {
  try {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    if (defaultCal?.id) return defaultCal.id;
  } catch {
    // getDefaultCalendarAsync may not be available or may need full access
  }

  // Fallback: try to list calendars (works when full access is granted)
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find(
      (cal) =>
        cal.allowsModifications &&
        (cal.isPrimary ||
          cal.source?.type === Calendar.SourceType.LOCAL ||
          cal.source?.type === Calendar.SourceType.CALDAV)
    );
    if (writable) return writable.id;

    // Last resort: any writable calendar
    return calendars.find((cal) => cal.allowsModifications)?.id || null;
  } catch {
    // Cannot list calendars (write-only mode on iOS 17+)
  }

  // Create a dedicated app calendar as last resort
  if (Platform.OS === 'ios') {
    try {
      return await Calendar.createCalendarAsync({
        title: 'Game Over Events',
        color: '#5A7EB0',
        entityType: Calendar.EntityTypes.EVENT,
        source: { isLocalAccount: true, name: 'Game Over', type: Calendar.SourceType.LOCAL },
        name: 'Game Over',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
    } catch {
      // Cannot create calendar
    }
  }

  return null;
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
    const hasPermission = await requestWritePermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Calendar permission denied. Please enable it in your device settings.',
      };
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      return {
        success: false,
        error: 'No writable calendar found on your device.',
      };
    }

    const startDate = new Date(eventData.startDate);
    const endDate = eventData.endDate
      ? new Date(eventData.endDate)
      : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    let notes = eventData.notes || '';
    if (eventData.bookingReference) {
      notes = `Booking Reference: ${eventData.bookingReference}\n\n${notes}`;
    }
    notes += '\n\nCreated by Game Over App';

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

/**
 * Edit Event Screen (Phase 5)
 * Form to edit event details
 */

import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/queries/useEvents';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const editEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  honoree_name: z.string().min(1, 'Honoree name is required'),
  vibe: z.string().optional(),
});

type EditEventForm = z.infer<typeof editEventSchema>;

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: event, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Check if user is the organizer
  const isOrganizer = event?.created_by === user?.id;

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event?.title || 'this event'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsDeleting(true);
            try {
              await deleteEvent.mutateAsync(id);
              router.replace('/(tabs)/events');
            } catch (error) {
              console.error('Failed to delete event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditEventForm>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: event?.title || '',
      honoree_name: event?.honoree_name || '',
      vibe: event?.vibe || '',
    },
  });

  const onSubmit = async (data: EditEventForm) => {
    if (!id) return;
    try {
      await updateEvent.mutateAsync({
        eventId: id,
        updates: data,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  if (isLoading || !event) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="$surface"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => router.back()}
            testID="back-button"
          >
            <Ionicons name="close" size={28} color="#1A202C" />
          </XStack>
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            Edit Event
          </Text>
          <XStack width={40} />
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event Details Card */}
          <Card marginBottom="$4">
            <YStack gap="$4">
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                Event Details
              </Text>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Event Title"
                    placeholder="e.g., John's Bachelor Weekend"
                    value={value}
                    onChangeText={onChange}
                    error={errors.title?.message}
                    testID="title-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="honoree_name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Honoree Name"
                    placeholder="Who are you celebrating?"
                    value={value}
                    onChangeText={onChange}
                    error={errors.honoree_name?.message}
                    testID="honoree-name-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="vibe"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Event Vibe (Optional)"
                    placeholder="e.g., Classy but fun, wild adventure..."
                    value={value}
                    onChangeText={onChange}
                    testID="vibe-input"
                  />
                )}
              />

            </YStack>
          </Card>

          {/* Read-only Info */}
          <Card variant="filled">
            <YStack gap="$3">
              <Text fontSize="$3" fontWeight="600" color="$textSecondary">
                Event Info (Read-only)
              </Text>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">Destination</Text>
                <Text color="$textPrimary" fontWeight="500">
                  {event.city?.name || 'Not set'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">Party Type</Text>
                <Text color="$textPrimary" fontWeight="500" textTransform="capitalize">
                  {event.party_type?.replace('_', ' ') || 'Not set'}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">Start Date</Text>
                <Text color="$textPrimary" fontWeight="500">
                  {event.start_date
                    ? new Date(event.start_date).toLocaleDateString()
                    : 'Not set'}
                </Text>
              </XStack>

              <Text fontSize="$1" color="$textMuted" marginTop="$2">
                To change destination or dates, please contact support.
              </Text>
            </YStack>
          </Card>

          {/* Delete Event Section - Only show for organizers */}
          {isOrganizer && (
            <Card variant="filled" marginTop="$6">
              <YStack gap="$3">
                <Text fontSize="$3" fontWeight="600" color="$error">
                  Danger Zone
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  Deleting this event will permanently remove all associated data including participants, bookings, and chat history.
                </Text>
                <Button
                  variant="secondary"
                  onPress={handleDeleteEvent}
                  loading={isDeleting}
                  disabled={isDeleting}
                  testID="delete-event-button"
                >
                  <XStack gap="$2" alignItems="center">
                    <Ionicons name="trash-outline" size={18} color="#E12D39" />
                    <Text color="$error" fontWeight="600">
                      Delete Event
                    </Text>
                  </XStack>
                </Button>
              </YStack>
            </Card>
          )}
        </ScrollView>

        {/* Save Button */}
        <XStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          padding="$4"
          paddingBottom={insets.bottom + 16}
          backgroundColor="$surface"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            flex={1}
            onPress={handleSubmit(onSubmit)}
            loading={updateEvent.isPending}
            disabled={!isDirty}
            testID="save-button"
          >
            Save Changes
          </Button>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}

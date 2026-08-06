/**
 * Edit Event Screen (Phase 5)
 * Form to edit event details
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/queries/useEvents';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { feedback } from '@/stores/uiStore';
import { useTranslation } from '@/i18n';
import { resolveEventCapabilities } from '@/utils/permissions';

type EditEventForm = {
  title: string;
  honoree_name: string;
  vibe?: string;
};

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t, language } = useTranslation();
  const editEventSchema = useMemo(() => z.object({
    title: z.string().min(1, t.editEvent.titleRequired),
    honoree_name: z.string().min(1, t.editEvent.honoreeNameRequired),
    vibe: z.string().optional(),
  }), [t.editEvent.honoreeNameRequired, t.editEvent.titleRequired]);

  const { data: event, isLoading } = useEvent(id);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const capabilities = resolveEventCapabilities({ event, userId: user?.id });

  const handleDeleteEvent = async () => {
    const confirmed = await feedback.confirm({
      title: t.editEvent.deleteEvent,
      message: t.editEvent.deleteConfirmMessage.replace('{{title}}', event?.title || t.editEvent.notSet),
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      destructive: true,
    });
    if (!confirmed || !id) return;
    setIsDeleting(true);
    try {
      await deleteEvent.mutateAsync(id);
      router.replace('/(tabs)/events');
    } catch (error) {
      console.error('Failed to delete event:', error);
      feedback.error(t.common.error, t.editEvent.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
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
    if (!id || !capabilities.canEditEvent) return;
    try {
      await updateEvent.mutateAsync({
        eventId: id,
        updates: data,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update event:', error);
      feedback.error(t.common.error, t.editEvent.updateFailed);
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
            {t.editEvent.title}
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
                {t.editEvent.details}
              </Text>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t.editEvent.eventTitle}
                    placeholder={t.editEvent.eventTitlePlaceholder}
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
                    label={t.editEvent.honoreeName}
                    placeholder={t.editEvent.honoreeNamePlaceholder}
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
                    label={t.editEvent.vibeOptional}
                    placeholder={t.editEvent.vibePlaceholder}
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
                {t.editEvent.infoReadOnly}
              </Text>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">{t.editEvent.destination}</Text>
                <Text color="$textPrimary" fontWeight="500">
                  {event.city?.name || t.editEvent.notSet}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">{t.editEvent.partyType}</Text>
                <Text color="$textPrimary" fontWeight="500" textTransform="capitalize">
                  {event.party_type === 'bachelor'
                    ? t.wizard.bachelor
                    : event.party_type === 'bachelorette'
                      ? t.wizard.bachelorette
                      : t.editEvent.notSet}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <Text color="$textSecondary">{t.editEvent.startDate}</Text>
                <Text color="$textPrimary" fontWeight="500">
                  {event.start_date
                    ? new Date(event.start_date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US')
                    : t.editEvent.notSet}
                </Text>
              </XStack>

              <Text fontSize="$1" color="$textMuted" marginTop="$2">
                {t.editEvent.changeInfoHint}
              </Text>
            </YStack>
          </Card>

          {/* Delete Event Section - Only show for organizers */}
          {capabilities.canEditEvent && (
            <Card variant="filled" marginTop="$6">
              <YStack gap="$3">
                <Text fontSize="$3" fontWeight="600" color="$error">
                  {t.editEvent.dangerZone}
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  {t.editEvent.deleteWarning}
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
                      {t.editEvent.deleteEvent}
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
            disabled={!isDirty || !capabilities.canEditEvent}
            testID="save-button"
          >
            {t.editEvent.saveChanges}
          </Button>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}

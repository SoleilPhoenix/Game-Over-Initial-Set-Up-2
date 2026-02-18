/**
 * Manage Invitations Screen — Redesigned
 * Shows ALL participant slots: organizer (pre-filled), guests (editable), honoree (pre-filled).
 * Organizer can fill in guest contact details and send invitations.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollView, Share, Pressable, StyleSheet, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

// ─── Phone Formatting ──────────────────────────
/** Auto-formats German mobile numbers (01x prefix) as XXXX-XXXXXXX */
function formatGermanPhone(text: string): string {
  const digits = text.replace(/\D/g, '');
  // Only auto-dash for German mobile (01x prefix) once prefix is complete
  if (digits.startsWith('01') && digits.length > 4) {
    return digits.slice(0, 4) + '-' + digits.slice(4, 15);
  }
  return digits.slice(0, 15);
}

// ─── Email Autocomplete ────────────────────────
const COMMON_DOMAINS = [
  'gmail.com', 'gmx.de', 'web.de', 't-online.de',
  'outlook.com', 'yahoo.de', 'freenet.de', 'icloud.com', 'hotmail.com',
];

function getEmailSuggestions(email: string): string[] {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return [];
  const afterAt = email.slice(atIdx + 1).toLowerCase();
  if (!afterAt) return COMMON_DOMAINS.slice(0, 5);
  return COMMON_DOMAINS.filter(d => d.startsWith(afterAt));
}
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useBooking } from '@/hooks/queries/useBookings';
import { useUser } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { ParticipantWithProfile } from '@/repositories';
import { loadDesiredParticipants, loadGuestDetails, saveGuestDetails, type GuestDetail } from '@/lib/participantCountCache';

type SlotRole = 'organizer' | 'guest' | 'honoree';
type SlotStatus = 'confirmed' | 'pending' | 'not_invited';

type GuestDetails = GuestDetail;

interface Slot {
  index: number;
  role: SlotRole;
  name: string;
  email: string;
  phone: string;
  status: SlotStatus;
  isEditable: boolean;
  isExpanded: boolean;
  participant?: ParticipantWithProfile;
}

export default function ManageInvitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useUser();

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants, isLoading: participantsLoading } = useParticipants(id);
  const { data: booking, isLoading: bookingLoading } = useBooking(id);

  // Local state for guest details entered by organizer
  const [guestDetails, setGuestDetails] = useState<Record<number, GuestDetails>>({});
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeEmailSlot, setActiveEmailSlot] = useState<number | null>(null);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const emailBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cached desired participant count (set during wizard/booking)
  const [cachedParticipants, setCachedParticipants] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    loadDesiredParticipants(id).then(setCachedParticipants);
    loadGuestDetails(id).then((cached) => {
      if (Object.keys(cached).length > 0) setGuestDetails(cached);
    });
  }, [id]);

  // Only show full-screen spinner if we have NO event data at all
  // Participants and booking load in background — slots use cache as fallback
  const isLoading = eventLoading && !event;

  // Build slots array
  const slots = useMemo((): Slot[] => {
    if (!event) return [];

    // Derive desired participant count: cache > booking > fallback
    const bookingTotal = booking
      ? booking.paying_participants + (booking.exclude_honoree ? 1 : 0)
      : 0;
    const totalSlots = cachedParticipants || bookingTotal || 10;
    const result: Slot[] = [];

    // Organizer info
    const organizerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
    const organizerEmail = user?.email || '';

    // Map DB participants by role
    const dbParticipants = participants || [];
    const organizerParticipant = dbParticipants.find(p => p.role === 'organizer');
    const honoreeParticipant = dbParticipants.find(p => p.role === 'honoree');
    const guestParticipants = dbParticipants.filter(p => p.role === 'guest');

    // Slot 1: Organizer (pre-filled but phone is editable)
    const orgPhone = guestDetails[-1]?.phone || (organizerParticipant?.profile as any)?.phone || '';
    result.push({
      index: 0,
      role: 'organizer',
      name: organizerParticipant?.profile?.full_name || organizerName,
      email: organizerParticipant?.profile?.email || (organizerParticipant as any)?.email || organizerEmail,
      phone: orgPhone,
      status: 'confirmed', // organizer is always confirmed
      isEditable: true, // allow editing phone
      isExpanded: expandedSlot === 0,
      participant: organizerParticipant,
    });

    // Middle slots: guests (filled from DB + empty)
    const guestSlotCount = Math.max(totalSlots - 2, 0); // minus organizer and honoree
    for (let i = 0; i < guestSlotCount; i++) {
      const dbGuest = guestParticipants[i];
      const slotIdx = i + 1;
      const localDetails = guestDetails[slotIdx];

      if (dbGuest) {
        result.push({
          index: i + 1,
          role: 'guest',
          name: dbGuest.profile?.full_name || 'Guest',
          email: dbGuest.profile?.email || (dbGuest as any)?.email || '',
          phone: (dbGuest.profile as any)?.phone || '',
          status: dbGuest.confirmed_at ? 'confirmed' : 'pending',
          isEditable: false,
          isExpanded: false,
          participant: dbGuest,
        });
      } else {
        result.push({
          index: i + 1,
          role: 'guest',
          name: localDetails
            ? `${localDetails.firstName} ${localDetails.lastName}`.trim()
            : '',
          email: localDetails?.email || '',
          phone: localDetails?.phone || '',
          status: 'not_invited',
          isEditable: true,
          isExpanded: expandedSlot === i + 1,
        });
      }
    }

    // Last slot: Honoree (name pre-filled, email/phone editable)
    const honoreeLocal = guestDetails[totalSlots - 1];
    result.push({
      index: totalSlots - 1,
      role: 'honoree',
      name: honoreeParticipant?.profile?.full_name || event.honoree_name || 'Honoree',
      email: honoreeLocal?.email || honoreeParticipant?.profile?.email || (honoreeParticipant as any)?.email || '',
      phone: honoreeLocal?.phone || (honoreeParticipant?.profile as any)?.phone || '',
      status: honoreeParticipant?.confirmed_at ? 'confirmed' : 'pending',
      isEditable: true, // allow adding email/phone for honoree
      isExpanded: expandedSlot === totalSlots - 1,
      participant: honoreeParticipant,
    });

    return result;
  }, [event, participants, user, guestDetails, expandedSlot, booking, cachedParticipants]);

  // Stats — "filled" = has email (contact info provided, not just a name)
  const filledCount = slots.filter(s => !!s.email).length;
  const totalSlots = slots.length;
  const confirmedCount = slots.filter(s => s.status === 'confirmed').length;
  const pendingCount = slots.filter(s => s.status === 'pending').length;

  const updateGuestDetail = (slotIndex: number, field: keyof GuestDetails, value: string) => {
    const formatted = field === 'phone' ? formatGermanPhone(value) : value;
    setGuestDetails(prev => {
      const updated = {
        ...prev,
        [slotIndex]: {
          ...prev[slotIndex],
          [field]: formatted,
        },
      };
      // Persist to AsyncStorage cache
      if (id) saveGuestDetails(id, updated).catch(() => {});
      return updated;
    });
    // Update email suggestions when email field changes
    if (field === 'email') {
      setEmailSuggestions(getEmailSuggestions(value));
    }
  };

  const handleEmailFocus = (slotIndex: number, currentValue: string) => {
    if (emailBlurTimerRef.current) clearTimeout(emailBlurTimerRef.current);
    setActiveEmailSlot(slotIndex);
    setEmailSuggestions(getEmailSuggestions(currentValue));
  };

  const handleEmailBlur = () => {
    // Delay to allow tap on suggestion to fire first
    emailBlurTimerRef.current = setTimeout(() => {
      setActiveEmailSlot(null);
      setEmailSuggestions([]);
    }, 200);
  };

  const selectEmailSuggestion = (slotIndex: number, domain: string) => {
    if (emailBlurTimerRef.current) clearTimeout(emailBlurTimerRef.current);
    const current = guestDetails[slotIndex]?.email || '';
    const atIdx = current.indexOf('@');
    const newEmail = atIdx >= 0 ? current.slice(0, atIdx + 1) + domain : current + '@' + domain;
    updateGuestDetail(slotIndex, 'email', newEmail);
    setActiveEmailSlot(null);
    setEmailSuggestions([]);
  };

  const handleInviteAll = async () => {
    setInviteLoading(true);
    try {
      // Collect all emails from filled guest slots
      const guestEmails = slots
        .filter(s => s.role === 'guest' && s.email)
        .map(s => s.email);

      const inviteCode = `${id}-${Date.now().toString(36)}`;
      const inviteLink = `https://game-over.app/invite/${inviteCode}`;
      const message = t.manageInvitations.inviteMessage
        .replace('{{name}}', event?.honoree_name || 'the party')
        .replace('{{link}}', inviteLink);

      await Share.share({
        message,
        title: t.manageInvitations.title,
      });
    } catch (error) {
      console.error('Failed to share invites:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const getRoleBadge = (role: SlotRole) => {
    switch (role) {
      case 'organizer':
        return { label: t.manageInvitations.organizer, bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' };
      case 'honoree':
        return { label: t.manageInvitations.honoree, bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' };
      default:
        return { label: t.manageInvitations.guest, bg: 'rgba(107, 114, 128, 0.2)', color: DARK_THEME.textSecondary };
    }
  };

  const getStatusConfig = (status: SlotStatus) => {
    switch (status) {
      case 'confirmed':
        return { icon: 'checkmark-circle' as const, color: '#10B981', label: t.manageInvitations.confirmed };
      case 'pending':
        return { icon: 'time-outline' as const, color: '#F59E0B', label: t.manageInvitations.pending };
      default:
        return { icon: 'remove-circle-outline' as const, color: DARK_THEME.textTertiary, label: t.manageInvitations.notInvited };
    }
  };

  const renderSlotCard = (slot: Slot) => {
    const roleBadge = getRoleBadge(slot.role);
    const statusConfig = getStatusConfig(slot.status);
    const initial = slot.name ? slot.name.charAt(0).toUpperCase() : String(slot.index + 1);
    const isEmpty = slot.role === 'guest' && slot.isEditable && !slot.name && !slot.email;
    const needsContactInfo = (slot.role === 'organizer' && !slot.phone) || (slot.role === 'honoree' && !slot.email);
    const guestNum = slot.role === 'guest' ? slot.index : 0;
    const displayName = slot.name ||
      t.manageInvitations.guestSlot.replace('{{number}}', String(guestNum));

    return (
      <Pressable
        key={`${slot.role}-${slot.index}`}
        style={[styles.slotCard, isEmpty && styles.slotCardEmpty]}
        onPress={slot.isEditable ? () => setExpandedSlot(slot.isExpanded ? null : slot.index) : undefined}
      >
        <XStack alignItems="center" gap={12}>
          {/* Avatar / Number */}
          <View style={[
            styles.avatar,
            slot.role === 'organizer' && styles.avatarOrganizer,
            slot.role === 'honoree' && styles.avatarHonoree,
            isEmpty && styles.avatarEmpty,
          ]}>
            {slot.role === 'honoree' ? (
              <Ionicons name="star" size={18} color="#F59E0B" />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>

          {/* Details */}
          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap={8}>
              <Text style={[styles.slotName, isEmpty && styles.slotNameEmpty]} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            </XStack>

            {/* Contact info (for filled slots) */}
            {(slot.email || slot.phone) && (
              <YStack gap={2} marginTop={2}>
                {slot.email ? (
                  <XStack alignItems="center" gap={6}>
                    <Ionicons name="mail-outline" size={12} color={DARK_THEME.textTertiary} />
                    <Text style={styles.detailText} numberOfLines={1}>{slot.email}</Text>
                  </XStack>
                ) : null}
                {slot.phone ? (
                  <XStack alignItems="center" gap={6}>
                    <Ionicons name="call-outline" size={12} color={DARK_THEME.textTertiary} />
                    <Text style={styles.detailText} numberOfLines={1}>{slot.phone}</Text>
                  </XStack>
                ) : null}
              </YStack>
            )}

            {/* Empty slot hint */}
            {isEmpty && !slot.isExpanded && (
              <Text style={styles.fillHint}>{t.manageInvitations.fillDetails}</Text>
            )}
            {/* Contact info hint for organizer/honoree */}
            {needsContactInfo && !slot.isExpanded && (
              <Text style={styles.fillHint}>
                {slot.role === 'organizer' ? 'Tap to add phone number' : 'Tap to add contact details'}
              </Text>
            )}
          </YStack>

          {/* Status indicator */}
          <XStack alignItems="center" gap={4}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
          </XStack>
        </XStack>

        {/* Expanded edit form */}
        {slot.isEditable && slot.isExpanded && (
          <YStack gap={10} marginTop={14} paddingTop={14} borderTopWidth={1} borderTopColor={DARK_THEME.glassBorder}>
            {/* Organizer: only phone field */}
            {slot.role === 'organizer' && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t.manageInvitations.phone}
                  placeholderTextColor={DARK_THEME.textTertiary}
                  value={guestDetails[-1]?.phone || ''}
                  onChangeText={(v) => updateGuestDetail(-1, 'phone', v)}
                  keyboardType="phone-pad"
                />
              </View>
            )}
            {/* Honoree: email + phone (name comes from wizard) */}
            {slot.role === 'honoree' && (
              <>
                <View style={{ zIndex: activeEmailSlot === slot.index ? 100 : 1 }}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.manageInvitations.email}
                      placeholderTextColor={DARK_THEME.textTertiary}
                      value={guestDetails[slot.index]?.email || ''}
                      onChangeText={(v) => updateGuestDetail(slot.index, 'email', v)}
                      onFocus={() => handleEmailFocus(slot.index, guestDetails[slot.index]?.email || '')}
                      onBlur={handleEmailBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {activeEmailSlot === slot.index && emailSuggestions.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {emailSuggestions.map(domain => (
                        <Pressable
                          key={domain}
                          style={styles.suggestionItem}
                          onPress={() => selectEmailSuggestion(slot.index, domain)}
                        >
                          <Ionicons name="mail-outline" size={13} color={DARK_THEME.textTertiary} />
                          <Text style={styles.suggestionText}>{domain}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t.manageInvitations.phone}
                    placeholderTextColor={DARK_THEME.textTertiary}
                    value={guestDetails[slot.index]?.phone || ''}
                    onChangeText={(v) => updateGuestDetail(slot.index, 'phone', v)}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}
            {/* Guest: full form (name + email + phone) */}
            {slot.role === 'guest' && (
              <>
                <XStack gap={10}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.manageInvitations.firstName}
                      placeholderTextColor={DARK_THEME.textTertiary}
                      value={guestDetails[slot.index]?.firstName || ''}
                      onChangeText={(v) => updateGuestDetail(slot.index, 'firstName', v)}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.manageInvitations.lastName}
                      placeholderTextColor={DARK_THEME.textTertiary}
                      value={guestDetails[slot.index]?.lastName || ''}
                      onChangeText={(v) => updateGuestDetail(slot.index, 'lastName', v)}
                      autoCapitalize="words"
                    />
                  </View>
                </XStack>
                <View style={{ zIndex: activeEmailSlot === slot.index ? 100 : 1 }}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.manageInvitations.email}
                      placeholderTextColor={DARK_THEME.textTertiary}
                      value={guestDetails[slot.index]?.email || ''}
                      onChangeText={(v) => updateGuestDetail(slot.index, 'email', v)}
                      onFocus={() => handleEmailFocus(slot.index, guestDetails[slot.index]?.email || '')}
                      onBlur={handleEmailBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {activeEmailSlot === slot.index && emailSuggestions.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {emailSuggestions.map(domain => (
                        <Pressable
                          key={domain}
                          style={styles.suggestionItem}
                          onPress={() => selectEmailSuggestion(slot.index, domain)}
                        >
                          <Ionicons name="mail-outline" size={13} color={DARK_THEME.textTertiary} />
                          <Text style={styles.suggestionText}>{domain}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={t.manageInvitations.phone}
                    placeholderTextColor={DARK_THEME.textTertiary}
                    value={guestDetails[slot.index]?.phone || ''}
                    onChangeText={(v) => updateGuestDetail(slot.index, 'phone', v)}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            {/* Confirm button */}
            <Pressable
              style={styles.confirmButton}
              onPress={() => setExpandedSlot(null)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </YStack>
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={DARK_THEME.primary} />
        </YStack>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
          <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t.manageInvitations.title}</Text>
          <View style={{ width: 24 }} />
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Stats Row */}
        <XStack gap={12} marginBottom={20}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{confirmedCount}</Text>
            <Text style={styles.statLabel}>{t.manageInvitations.confirmed}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>{t.manageInvitations.pending}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: DARK_THEME.textPrimary }]}>{totalSlots}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </XStack>

        {/* Slots info */}
        <XStack alignItems="center" justifyContent="space-between" marginBottom={12}>
          <Text style={styles.sectionTitle}>
            {t.manageInvitations.slots
              .replace('{{filled}}', String(filledCount))
              .replace('{{total}}', String(totalSlots))}
          </Text>
        </XStack>

        {/* Slot Cards — inject honoree info banner before the honoree slot */}
        {slots.map((slot) => (
          <View key={`slot-wrapper-${slot.role}-${slot.index}`}>
            {slot.role === 'honoree' && (
              <View style={styles.honoreeInfoBanner}>
                <XStack gap={10} alignItems="flex-start">
                  <View style={styles.honoreeInfoIcon}>
                    <Ionicons name="notifications" size={16} color="#F59E0B" />
                  </View>
                  <YStack flex={1} gap={6}>
                    <Text style={styles.honoreeInfoTitle}>Honoree wird automatisch benachrichtigt</Text>
                    <Text style={styles.honoreeInfoBody}>
                      Der Ehrengast erhält{' '}
                      <Text style={styles.honoreeInfoHighlight}>15 Minuten vor der ersten Aktivität</Text>
                      {' '}eine Einladung zur App und wird zur Teilnahme aufgefordert.
                    </Text>
                    <View style={styles.honoreePrivacyRow}>
                      <Ionicons name="eye-off-outline" size={13} color="#10B981" />
                      <Text style={styles.honoreePrivacyText}>
                        Budget & Kosten werden dem Ehrengast nicht angezeigt
                      </Text>
                    </View>
                  </YStack>
                </XStack>
              </View>
            )}
            {renderSlotCard(slot)}
          </View>
        ))}
      </ScrollView>

      {/* Invite All Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          flex={1}
          onPress={handleInviteAll}
          loading={inviteLoading}
          icon={<Ionicons name="paper-plane-outline" size={20} color="white" />}
          testID="invite-all-button"
        >
          {t.manageInvitations.inviteAll}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  statCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
  },
  slotCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 14,
    marginBottom: 10,
  },
  slotCardEmpty: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(35, 39, 47, 0.5)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrganizer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarHonoree: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  avatarEmpty: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
    flex: 1,
  },
  slotNameEmpty: {
    color: DARK_THEME.textTertiary,
    fontStyle: 'italic',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 12,
    color: DARK_THEME.textSecondary,
    flex: 1,
  },
  fillHint: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: DARK_THEME.deepNavy,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  input: {
    color: DARK_THEME.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5A7EB0',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  honoreeInfoBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 14,
    marginBottom: 8,
  },
  honoreeInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  honoreeInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  honoreeInfoBody: {
    fontSize: 12,
    color: DARK_THEME.textSecondary,
    lineHeight: 17,
  },
  honoreeInfoHighlight: {
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  honoreePrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  honoreePrivacyText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  suggestionBox: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionText: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: DARK_THEME.surface,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.glassBorder,
    flexDirection: 'row',
  },
});

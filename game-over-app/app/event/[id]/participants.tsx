/**
 * Manage Invitations Screen — Editorial re-skin (content-preserving).
 * Shows ALL participant slots: organizer (pre-filled), guests (editable), honoree (pre-filled).
 * Organizer can fill in guest contact details and send invitations.
 *
 * Phase A-3: swaps DARK_THEME.* → useTheme tokens, unifies primary accents to gold.
 * Semantic colors (role badges blue/amber, status green/red) intentionally preserved.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollView, Share, ActivityIndicator, Pressable, StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';

// ─── Phone Formatting ──────────────────────────
/** Auto-formats German phone numbers with dash after prefix */
function formatGermanPhone(text: string): string {
  // Strip all non-digits except leading +
  const hasPlus = text.trimStart().startsWith('+');
  const digits = text.replace(/\D/g, '');

  // International format: +49 or 49 prefix (e.g. 4915254904344)
  if (digits.startsWith('49') && digits.length > 2) {
    const national = digits.slice(2); // strip country code
    // Mobile: 15x / 16x / 17x — dash after 3-digit prefix
    if (/^1[567]\d/.test(national) && national.length > 3) {
      return `+49 ${national.slice(0, 3)}-${national.slice(3, 13)}`;
    }
    // Other: just show +49 prefix
    return `+49 ${national.slice(0, 13)}`;
  }

  // Local German mobile (01x prefix) — dash after 4-digit prefix
  if (digits.startsWith('01') && digits.length > 4) {
    return digits.slice(0, 4) + '-' + digits.slice(4, 15);
  }

  const prefix = hasPlus ? '+' : '';
  return prefix + digits.slice(0, 15);
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
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { participantKeys } from '@/hooks/queries/useParticipants';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useInviteGuests } from '@/hooks/queries/useInvites';
import { useBooking } from '@/hooks/queries/useBookings';
import { useUser } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { ambientShadow, type EditorialTheme } from '@/constants/designSystem';
import { Button } from '@/components/ui/Button';
import { GoldButton } from '@/components/ui/editorial';
import type { ParticipantWithProfile } from '@/repositories';
import { loadDesiredParticipants, loadBudgetInfo, loadGuestDetails, saveGuestDetails, setInvitedCount, type GuestDetail } from '@/lib/participantCountCache';
import { supabase } from '@/lib/supabase/client';

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
  const { id, role: roleParam } = useLocalSearchParams<{ id: string; role?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const user = useUser();

  const queryClient = useQueryClient();
  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants, isLoading: isLoadingParticipants } = useParticipants(id);
  const { data: booking, isLoading: bookingLoading } = useBooking(id);
  const currentParticipant = participants?.find(p => p.user_id === user?.id);
  // Use role param from navigation (known immediately) — fallback to participants query
  const isGuest = roleParam === 'guest' || (!roleParam && currentParticipant?.role === 'guest');

  // Guests see a read-only view — no redirect needed

  // Local state for guest details entered by organizer
  const [guestDetails, setGuestDetails] = useState<Record<number, GuestDetails>>({});
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  type InviteSendStatus = 'idle' | 'sending' | 'done';
  type GuestResult = { slotIndex: number; status: 'sent' | 'failed' | 'invalid'; recipient: string; error?: string };
  const [inviteSendStatus, setInviteSendStatus] = useState<InviteSendStatus>('idle');
  const [inviteResults, setInviteResults] = useState<GuestResult[]>([]);
  const [activeChannel, setActiveChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [activeEmailSlot, setActiveEmailSlot] = useState<number | null>(null);
  const [showHonoreeInfo, setShowHonoreeInfo] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const emailBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cached desired participant count (set during wizard/booking)
  const [cachedParticipants, setCachedParticipants] = useState<number | undefined>(undefined);
  const [cachedBudgetTotal, setCachedBudgetTotal] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    loadDesiredParticipants(id).then(setCachedParticipants);
    // budgetInfo.totalParticipants is the authoritative count (stored correctly at first payment)
    // It auto-corrects inflated desired_participant_counts from old payment bug
    loadBudgetInfo(id).then(info => { if (info?.totalParticipants) setCachedBudgetTotal(info.totalParticipants); });
    loadGuestDetails(id).then((cached) => {
      if (Object.keys(cached).length > 0) setGuestDetails(cached);
    });
  }, [id]);

  // Fetch invite_codes to resolve names for registered guests
  // (organizer-entered data is the source of truth)
  const { data: rawInviteGuests = [] } = useInviteGuests(id ?? null);
  const invitesByEmail = useMemo(() => {
    const map: Record<string, { phone: string; firstName: string; lastName: string }> = {};
    for (const ic of rawInviteGuests) {
      if (ic.guest_email) {
        map[ic.guest_email.toLowerCase()] = {
          phone: '',
          firstName: ic.guest_first_name || '',
          lastName: ic.guest_last_name || '',
        };
      }
    }
    return map;
  }, [rawInviteGuests]);

  // Fetch own profile from DB so organizer name is shown even if user_metadata.full_name is unset.
  // Also ensures guests see their updated name after editing in profile settings.
  const [ownProfile, setOwnProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const fetchOwnProfile = useCallback(() => {
    if (!user?.id) return;
    void supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setOwnProfile(data); });
  }, [user?.id]);
  useEffect(fetchOwnProfile, [fetchOwnProfile]);

  // Cleanup emailBlurTimer on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (emailBlurTimerRef.current) {
        clearTimeout(emailBlurTimerRef.current);
      }
    };
  }, []);

  // Refetch participants on focus so guest profile changes (name, phone) appear immediately
  useFocusEffect(
    useCallback(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: participantKeys.byEvent(id) });
      }
    }, [id, queryClient])
  );

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
    // Prefer budgetInfo.totalParticipants (set correctly at first payment) over
    // desired_participant_counts which may be inflated from old payment bugs
    const totalSlots = cachedBudgetTotal || cachedParticipants || bookingTotal || 10;
    const result: Slot[] = [];

    // Map DB participants by role
    const dbParticipants = participants || [];
    const organizerParticipant = dbParticipants.find(p => p.role === 'organizer');
    const honoreeParticipant = dbParticipants.find(p => p.role === 'honoree');
    const guestParticipants = dbParticipants.filter(p => p.role === 'guest');

    // Organizer info — prefer profile data; when isGuest never fall back to current user's data
    const organizerEmail = organizerParticipant?.profile?.email
      || (organizerParticipant as any)?.email
      || (isGuest ? '' : (user?.email || ''));
    const organizerName = organizerParticipant?.profile?.full_name
      || organizerParticipant?.profile?.email?.split('@')[0]
      || (isGuest ? 'Organizer' : (
        user?.user_metadata?.full_name || ownProfile?.full_name || user?.email?.split('@')[0] || 'You'
      ));

    // Slot 1: Organizer (pre-filled but phone is editable)
    const orgPhone = guestDetails[-1]?.phone || organizerParticipant?.profile?.phone || '';
    result.push({
      index: 0,
      role: 'organizer',
      name: organizerName,
      email: organizerEmail,
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
        // When the current user IS this guest, prefer their own (potentially updated) profile data
        const isCurrentUserGuest = dbGuest.user_id === user?.id;
        const guestEmail = dbGuest.profile?.email || (dbGuest as any)?.email || '';
        // Name: prefer organizer-entered data from invite_codes (source of truth)
        // so the name shown matches what the organizer entered, not what the guest typed
        const inviteData = invitesByEmail[guestEmail.toLowerCase()];
        const inviteName = inviteData
          ? [inviteData.firstName, inviteData.lastName].filter(Boolean).join(' ')
          : '';
        const guestName = inviteName
          || (isCurrentUserGuest
            ? (ownProfile?.full_name || dbGuest.profile?.full_name || user?.user_metadata?.full_name || 'Guest')
            : (dbGuest.profile?.full_name || 'Guest'));
        // Phone: prefer invite_codes data (organizer-entered) over profile.phone
        const guestPhone = inviteData?.phone || (dbGuest.profile as any)?.phone || '';
        result.push({
          index: i + 1,
          role: 'guest',
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          status: dbGuest.confirmed_at ? 'confirmed' : (dbGuest.user_id ? 'pending' : 'not_invited'),
          isEditable: false,
          isExpanded: false,
          participant: dbGuest,
        });
      } else {
        result.push({
          index: i + 1,
          role: 'guest',
          name: localDetails
            ? [localDetails.firstName, localDetails.lastName].filter(Boolean).join(' ')
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
  }, [event, participants, user, guestDetails, expandedSlot, booking, cachedParticipants, cachedBudgetTotal, isGuest, invitesByEmail, ownProfile]);

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

  // Guests only (excludes organizer AND honoree) — honoree is notified separately 1h before event
  const invitableGuests = useMemo(
    () => slots.filter(s => s.role === 'guest' && (s.email || s.phone)),
    [slots]
  );
  const hasEmails = invitableGuests.some(s => s.email);
  const hasPhones = invitableGuests.some(s => s.phone);
  const emailCount = invitableGuests.filter(s => s.email).length;
  const phoneCount = invitableGuests.filter(s => s.phone).length;

  const handleSendViaChannel = async (channel: 'email' | 'sms' | 'whatsapp') => {
    setActiveChannel(channel);
    setInviteSendStatus('sending');

    // Ensure the session token is fresh — an expired JWT causes a 401 at the
    // Supabase edge function runtime before our code even runs.
    // If refresh fails, getSession() still returns the current (possibly valid) session.
    await supabase.auth.refreshSession().catch(() => {});
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      Alert.alert('Session expired', 'Please log out and log in again.');
      setInviteSendStatus('idle');
      return;
    }

    // Build guest payload — honoree excluded (notified separately 1h before event)
    const guests = slots
      .filter(s => s.role === 'guest')
      .map(s => ({
        slotIndex: s.index,
        firstName: guestDetails[s.index]?.firstName || s.name.split(' ')[0] || undefined,
        lastName: guestDetails[s.index]?.lastName || undefined,
        email: guestDetails[s.index]?.email || s.email || undefined,
        phone: guestDetails[s.index]?.phone || s.phone || undefined,
      }));

    const { data, error } = await supabase.functions.invoke('send-guest-invitations', {
      body: { eventId: id, channel, guests },
    });

    if (error) {
      // Decode actual error body from the function response
      let detail = error.message ?? 'Unknown error';
      let statusCode = '';
      try {
        const ctx = (error as any).context;
        if (ctx) {
          statusCode = ctx.status ? ` [HTTP ${ctx.status}]` : '';
          const text = await ctx.text?.();
          if (text) {
            try {
              const body = JSON.parse(text);
              if (body?.error) detail = body.error;
              else if (body?.detail) detail = body.detail;
              else detail = text;
            } catch {
              detail = text;
            }
          }
        }
      } catch {}
      Alert.alert('Send failed', detail + statusCode);
      setInviteSendStatus('idle');
      return;
    }

    setInviteResults(data.results ?? []);
    setInviteSendStatus('done');
    // Track invited count for planning step 1 auto-check
    const sentCount = (data.results ?? []).filter((r: any) => r.status === 'sent').length;
    if (sentCount > 0 && id) {
      setInvitedCount(id, sentCount).catch(() => {});
    }
  };

  const handleShareFallback = async () => {
    const inviteLink = `https://game-over.app/invite/${id}`;
    const msg = `🎉 You're invited to celebrate ${event?.honoree_name || 'the party'}!\n\nJoin us on Game Over:\n${inviteLink}`;
    try { await Share.share({ message: msg, title: 'Game Over Invitation' }); } catch {}
  };

  const handleInviteAll = () => {
    setInviteSendStatus('idle');
    setInviteResults([]);
    setActiveChannel(null);
    setInviteModalVisible(true);
  };

  const getRoleBadge = (role: SlotRole) => {
    switch (role) {
      case 'organizer':
        return { label: t.manageInvitations.organizer, bg: 'rgba(107,114,128,0.18)', color: theme.textSecondary };
      case 'honoree':
        return { label: t.manageInvitations.honoree, bg: 'rgba(198,167,94,0.18)', color: '#C6A75E' };
      default:
        return { label: t.manageInvitations.guest, bg: 'rgba(107,114,128,0.18)', color: theme.textSecondary };
    }
  };

  const getStatusConfig = (status: SlotStatus) => {
    switch (status) {
      case 'confirmed':
        return { icon: 'checkmark-circle' as const, color: '#C6A75E', label: t.manageInvitations.confirmed };
      case 'pending':
        return { icon: 'time-outline' as const, color: '#C6A75E', label: t.manageInvitations.pending };
      default:
        return { icon: 'ellipse-outline' as const, color: theme.textTertiary, label: t.manageInvitations.notInvited };
    }
  };

  const renderSlotCard = (slot: Slot) => {
    const roleBadge = getRoleBadge(slot.role);
    const statusConfig = getStatusConfig(slot.status);
    const initial = slot.name ? slot.name.charAt(0).toUpperCase() : String(slot.index + 1);
    const isEmpty = slot.role === 'guest' && slot.isEditable && !slot.name && !slot.email;
    const needsContactInfo = (slot.role === 'organizer' && !slot.phone) || (slot.role === 'honoree' && !slot.email);
    const guestNum = slot.role === 'guest' ? slot.index + 1 : 0;
    const displayName = slot.name ||
      t.manageInvitations.guestSlot.replace('{{number}}', String(guestNum));

    return (
      <Pressable
        key={`${slot.role}-${slot.index}`}
        style={[styles.slotCard, isEmpty && styles.slotCardEmpty]}
        onPress={!isGuest && slot.isEditable ? () => setExpandedSlot(slot.isExpanded ? null : slot.index) : undefined}
      >
        <XStack alignItems="center" gap={12}>
          {/* Avatar with gold ring for honoree */}
          <View style={[
            styles.avatarRing,
            slot.role === 'honoree' && styles.avatarRingHonoree,
          ]}>
            <View style={[
              styles.avatar,
              slot.role === 'honoree' && styles.avatarHonoree,
              isEmpty && styles.avatarEmpty,
            ]}>
              {slot.role === 'honoree' ? (
                <Ionicons name="star" size={18} color="#C6A75E" />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
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
              {slot.role === 'honoree' && (
                <Pressable onPress={() => setShowHonoreeInfo(true)} hitSlop={10}>
                  <Ionicons name="information-circle-outline" size={17} color="#C6A75E" />
                </Pressable>
              )}
            </XStack>

            {/* Contact info (for filled slots) */}
            {(slot.email || slot.phone) && (
              <YStack gap={2} marginTop={2}>
                {slot.email ? (
                  <XStack alignItems="center" gap={6}>
                    <Ionicons name="mail-outline" size={12} color={theme.textTertiary} />
                    <Text style={styles.detailText} numberOfLines={1}>{slot.email}</Text>
                  </XStack>
                ) : null}
                {slot.phone ? (
                  <XStack alignItems="center" gap={6}>
                    <Ionicons name="call-outline" size={12} color={theme.textTertiary} />
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

          {/* Status indicator — top-right */}
          <Ionicons name={statusConfig.icon} size={20} color={statusConfig.color} />
        </XStack>

        {/* ── Bottom action strip (per mockup) ── */}
        {!isEmpty && (
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop={10}
            paddingTop={10}
            borderTopWidth={StyleSheet.hairlineWidth}
            borderTopColor={theme.ghostBorder}
          >
            <XStack gap={10} alignItems="center">
              {/* Confirmed checkmark */}
              <View style={[
                styles.actionChip,
                slot.status === 'confirmed' && styles.actionChipActive,
              ]}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={slot.status === 'confirmed' ? '#C6A75E' : theme.textTertiary}
                />
              </View>
              {/* Chat/message bubble */}
              <View style={styles.actionChip}>
                <Ionicons name="chatbubble-outline" size={14} color={theme.textTertiary} />
              </View>
            </XStack>
            <Text style={styles.statusLabel}>{statusConfig.label}</Text>
          </XStack>
        )}

        {/* Expanded edit form */}
        {slot.isEditable && slot.isExpanded && (
          <YStack gap={10} marginTop={14} paddingTop={14} borderTopWidth={1} borderTopColor={theme.ghostBorder}>
            {/* Organizer: only phone field */}
            {slot.role === 'organizer' && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t.manageInvitations.phone}
                  placeholderTextColor={theme.textTertiary}
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
                      placeholderTextColor={theme.textTertiary}
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
                          <Ionicons name="mail-outline" size={13} color={theme.textTertiary} />
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
                    placeholderTextColor={theme.textTertiary}
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
                      placeholderTextColor={theme.textTertiary}
                      value={guestDetails[slot.index]?.firstName || ''}
                      onChangeText={(v) => updateGuestDetail(slot.index, 'firstName', v)}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.manageInvitations.lastName}
                      placeholderTextColor={theme.textTertiary}
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
                      placeholderTextColor={theme.textTertiary}
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
                          <Ionicons name="mail-outline" size={13} color={theme.textTertiary} />
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
                    placeholderTextColor={theme.textTertiary}
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
              <Ionicons name="checkmark-circle" size={18} color={theme.textOnPrimary} />
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
          <Spinner size="large" color={theme.accentGold} />
        </YStack>
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
          <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
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
            <Text style={[styles.statNumber, { color: theme.accentGold }]}>{confirmedCount}</Text>
            <Text style={styles.statLabel}>{t.manageInvitations.confirmed}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: theme.accentGold }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>{t.manageInvitations.pending}</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: theme.textPrimary }]}>{totalSlots}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </XStack>

        {/* Slots info — STATUS chip */}
        <View style={styles.statusChipRow}>
          <Text style={styles.statusChipLabel}>STATUS</Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {t.manageInvitations.slots
                .replace('{{filled}}', String(filledCount))
                .replace('{{total}}', String(totalSlots))}
            </Text>
          </View>
        </View>

        {/* Slot Cards */}
        {slots.map((slot) => renderSlotCard(slot))}
      </ScrollView>

      {/* Invite All Footer — organizers only, edge-to-edge */}
      {!isGuest && (
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <GoldButton
            label={inviteLoading ? 'Sending…' : t.manageInvitations.inviteAll}
            fullWidth
            size="lg"
            leftIcon={<Ionicons name="paper-plane-outline" size={20} color="#1A2F47" />}
            onPress={handleInviteAll}
            testID="invite-all-button"
          />
        </View>
      )}

      {/* Honoree Info Popup */}
      {showHonoreeInfo && (
        <Pressable style={styles.infoOverlay} onPress={() => setShowHonoreeInfo(false)}>
          <Pressable style={[styles.infoSheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
            <View style={styles.infoHandle} />
            <XStack gap={12} alignItems="center" marginBottom={14}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="notifications" size={20} color="#C6A75E" />
              </View>
              <YStack flex={1}>
                <Text style={styles.infoTitle}>
                  {(t.manageInvitations as any).honoreeAutoNotified}
                </Text>
              </YStack>
              <Pressable onPress={() => setShowHonoreeInfo(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={theme.textTertiary} />
              </Pressable>
            </XStack>
            <Text style={styles.infoBody}>
              {(t.manageInvitations as any).honoreeNotificationBody
                .replace('{{time}}', (t.manageInvitations as any).honoreeNotificationTime)}
            </Text>
            <XStack alignItems="center" gap={6} marginTop={12} style={styles.infoPrivacyRow}>
              <Ionicons name="eye-off-outline" size={14} color="#C6A75E" />
              <Text style={styles.infoPrivacyText}>
                {(t.manageInvitations as any).honoreePrivacyNote}
              </Text>
            </XStack>
          </Pressable>
        </Pressable>
      )}
    </KeyboardAvoidingView>

      {/* ─── Invite Channel Modal — organizers only ─── */}
      {!isGuest && <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.inviteOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setInviteModalVisible(false)} />
          <View style={styles.inviteSheet} accessibilityViewIsModal={true}>
            {/* Handle + centered header */}
            <View style={styles.inviteHandle} />
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.inviteTitle}>
                {inviteSendStatus === 'done'
                  ? `${activeChannel === 'email' ? 'Email' : activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} sent`
                  : 'Invite All Guests'}
              </Text>
            </View>
            {inviteSendStatus !== 'sending' && (
              <Pressable
                style={{ position: 'absolute', top: 20, right: 16 }}
                onPress={() => setInviteModalVisible(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            )}

            {/* ── idle: channel picker ── */}
            {inviteSendStatus === 'idle' && (
              <>
                <Text style={[styles.inviteSectionLabel, { textAlign: 'center', marginBottom: 16 }]}>
                  SEND FROM GAME OVER
                </Text>
                <XStack gap={10} marginBottom={20}>
                  <Pressable
                    style={[styles.inviteChannelBtn, !hasEmails && styles.inviteChannelBtnDisabled]}
                    onPress={() => hasEmails && handleSendViaChannel('email')}
                  >
                    <Ionicons name="mail-outline" size={22} color={hasEmails ? '#C6A75E' : theme.textTertiary} />
                    <Text style={[styles.inviteChannelLabel, { color: hasEmails ? '#C6A75E' : theme.textTertiary }]}>Email</Text>
                    <Text style={styles.inviteChannelCount}>{emailCount} guest{emailCount !== 1 ? 's' : ''}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.inviteChannelBtn, !hasPhones && styles.inviteChannelBtnDisabled]}
                    onPress={() => hasPhones && handleSendViaChannel('sms')}
                  >
                    <Ionicons name="chatbubble-outline" size={22} color={hasPhones ? '#C6A75E' : theme.textTertiary} />
                    <Text style={[styles.inviteChannelLabel, { color: hasPhones ? '#C6A75E' : theme.textTertiary }]}>SMS</Text>
                    <Text style={styles.inviteChannelCount}>{phoneCount} guest{phoneCount !== 1 ? 's' : ''}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.inviteChannelBtn, !hasPhones && styles.inviteChannelBtnDisabled]}
                    onPress={() => hasPhones && handleSendViaChannel('whatsapp')}
                  >
                    <Ionicons name="logo-whatsapp" size={22} color={hasPhones ? '#C6A75E' : theme.textTertiary} />
                    <Text style={[styles.inviteChannelLabel, { color: hasPhones ? '#C6A75E' : theme.textTertiary }]}>WhatsApp</Text>
                    <Text style={styles.inviteChannelCount}>{phoneCount} guest{phoneCount !== 1 ? 's' : ''}</Text>
                  </Pressable>
                </XStack>
                <Pressable style={{ alignItems: 'center', paddingVertical: 8 }} onPress={handleShareFallback}>
                  <Text style={{ fontSize: 13, color: theme.textTertiary }}>Or share invite link via other apps →</Text>
                </Pressable>
              </>
            )}

            {/* ── sending: spinner ── */}
            {inviteSendStatus === 'sending' && (
              <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
                <ActivityIndicator size="large" color={theme.accentGold} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
                  Sending {activeChannel === 'email' ? 'email' : activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} invitations…
                </Text>
                <Text style={{ fontSize: 13, color: theme.textTertiary }}>
                  Validating and sending to {activeChannel === 'email' ? emailCount : phoneCount} guest{(activeChannel === 'email' ? emailCount : phoneCount) !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* ── done: results list ── */}
            {inviteSendStatus === 'done' && (
              <>
                <View style={{ backgroundColor: theme.surfaceHigh, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                    {inviteResults.filter(r => r.status === 'sent').length} sent ·{' '}
                    {inviteResults.filter(r => r.status === 'failed').length} failed ·{' '}
                    {inviteResults.filter(r => r.status === 'invalid').length} invalid
                  </Text>
                  {inviteResults.map((r, i) => (
                    <View key={i} style={[styles.inviteGuestRow, { paddingVertical: 8 }]}>
                      <Ionicons
                        name={r.status === 'sent' ? 'checkmark-circle' : r.status === 'invalid' ? 'warning-outline' : 'close-circle'}
                        size={18}
                        color={r.status === 'sent' ? '#10B981' : r.status === 'invalid' ? '#F59E0B' : '#EF4444'}
                      />
                      <YStack flex={1} marginLeft={10}>
                        <Text style={styles.inviteGuestName}>Guest {r.slotIndex}</Text>
                        <Text style={styles.inviteGuestPhone}>{r.recipient}{r.error ? ` — ${r.error}` : ''}</Text>
                      </YStack>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={[styles.inviteChannelBtn, { flex: 0, paddingHorizontal: 20, marginBottom: 10 }]}
                  onPress={() => { setInviteSendStatus('idle'); setInviteResults([]); setActiveChannel(null); }}
                >
                  <Text style={[styles.inviteChannelLabel, { color: theme.accentGold }]}>Send another channel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>}
    </>
  );
}

/** Style factory — consumes theme tokens, memoized per render in component. */
const makeStyles = (theme: EditorialTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.ghostBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  statCard: {
    backgroundColor: theme.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...ambientShadow(theme),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  slotCard: {
    backgroundColor: theme.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
    padding: 14,
    marginBottom: 10,
  },
  slotCardEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.ghostBorder,
    backgroundColor: theme.surfaceLow,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOrganizer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarHonoree: {
    backgroundColor: 'rgba(198, 167, 94, 0.18)',
  },
  avatarEmpty: {
    backgroundColor: theme.surfaceLow,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.ghostBorder,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
    flex: 1,
  },
  slotNameEmpty: {
    color: theme.textTertiary,
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
    color: theme.textSecondary,
    flex: 1,
  },
  fillHint: {
    fontSize: 12,
    color: theme.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: theme.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
  },
  input: {
    color: theme.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accentGold,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textOnPrimary,
  },
  infoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  infoSheet: {
    backgroundColor: theme.surfaceBright,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.ghostBorder,
  },
  infoHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.ghostBorder,
    alignSelf: 'center',
    marginBottom: 18,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C6A75E',
  },
  infoBody: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  infoPrivacyRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoPrivacyText: {
    fontSize: 13,
    color: '#C6A75E',
    fontWeight: '500',
    flex: 1,
  },
  suggestionBox: {
    backgroundColor: theme.surfaceLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
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
    borderBottomColor: theme.ghostBorder,
  },
  suggestionText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // No background/border — GoldButton is the visual element
  },
  // ─── Status chip (above participant list) ───
  statusChipRow: {
    marginBottom: 14,
    gap: 6,
  },
  statusChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: theme.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accentGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accentGold,
  },
  // ─── Avatar ring ───────────────────────────
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingHonoree: {
    borderColor: theme.accentGold,
    borderWidth: 2,
  },
  // ─── Bottom action strip ───────────────────
  actionChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceLow,
  },
  actionChipActive: {
    borderColor: theme.accentGold,
    backgroundColor: 'rgba(198,167,94,0.1)',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // ─── Invite Modal ───
  inviteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  inviteSheet: {
    backgroundColor: theme.surfaceBright,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: theme.ghostBorder,
  },
  inviteHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.ghostBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  invitePreview: {
    backgroundColor: theme.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
  },
  invitePreviewText: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  inviteSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inviteChannelBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.ghostBorder,
    paddingVertical: 14,
    gap: 4,
  },
  inviteChannelBtnDisabled: {
    opacity: 0.35,
  },
  inviteChannelLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteChannelCount: {
    fontSize: 11,
    color: theme.textTertiary,
  },
  inviteGuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.ghostBorder,
    gap: 10,
  },
  inviteGuestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteGuestInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  inviteGuestName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  inviteGuestPhone: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 1,
  },
  inviteWABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inviteWALabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25D366',
  },
});

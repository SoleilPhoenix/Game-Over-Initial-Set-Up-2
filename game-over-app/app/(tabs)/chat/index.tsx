/**
 * Communication Screen
 * Chat, Voting, Decisions with organized channel sections
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Animated, ScrollView, RefreshControl, Pressable, StyleSheet, View, StatusBar, Alert, Share, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useChannels, useCreateChannel } from '@/hooks/queries/useChat';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { useUser } from '@/stores/authStore';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import type { Database } from '@/lib/supabase/types';

type CommunicationTab = 'chat' | 'voting' | 'decisions';
type ChannelCategory = Database['public']['Enums']['channel_category'];

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];

type LocalChannel = {
  id: string;
  name: string;
};

type LocalChannelSection = {
  id: ChannelCategory;
  title: string;
  channels: LocalChannel[];
};

export default function CommunicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [selectedTab, setSelectedTab] = useState<CommunicationTab>('chat');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const { t } = useTranslation();
  const COMM_TABS = ['chat', 'voting', 'decisions'] as const;
  const { handlers: swipeHandlers, animatedStyle: swipeAnimStyle, switchTab: switchTabAnimated } = useSwipeTabs(COMM_TABS, selectedTab, setSelectedTab);

  // Local channel storage for when no event is selected
  const [localSections, setLocalSections] = useState<LocalChannelSection[]>([
    { id: 'general', title: 'GENERAL', channels: [] },
    { id: 'accommodation', title: 'ACCOMMODATION', channels: [] },
    { id: 'activities', title: 'ACTIVITIES', channels: [] },
    { id: 'budget', title: 'BUDGET', channels: [] },
  ]);

  // Fetch user's events
  const { data: events, refetch: refetchEvents } = useEvents();

  // Filter booked events
  const bookedEvents = useMemo(() => {
    return (events || []).filter(e => e.status === 'booked' || e.status === 'completed');
  }, [events]);

  // Auto-select nearest upcoming booked event on first load
  const hasAutoSelected = React.useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || bookedEvents.length === 0) return;
    hasAutoSelected.current = true;

    const now = Date.now();
    const sorted = [...bookedEvents].sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      // Prefer future events, then closest
      const aFuture = aDate >= now ? 0 : 1;
      const bFuture = bDate >= now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      return aDate - bDate;
    });
    setSelectedEventId(sorted[0].id);
  }, [bookedEvents]);

  // Fetch channels for selected event (only if event exists)
  const { data: dbChannels = [], refetch: refetchChannels } = useChannels(selectedEventId || undefined);

  // Create channel mutation
  const createChannelMutation = useCreateChannel();

  // Group channels by category (use DB channels if event exists, otherwise local)
  const groupedChannels = useMemo(() => {
    const groups: Record<ChannelCategory, Array<ChatChannel | LocalChannel>> = {
      general: [],
      accommodation: [],
      activities: [],
      budget: [],
    };

    if (selectedEventId && dbChannels.length > 0) {
      // Use database channels if event is selected
      dbChannels.forEach(channel => {
        if (groups[channel.category]) {
          groups[channel.category].push(channel);
        }
      });
    } else {
      // Use local channels otherwise
      localSections.forEach(section => {
        groups[section.id] = section.channels;
      });
    }

    return groups;
  }, [selectedEventId, dbChannels, localSections]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchChannels()]);
    setIsRefreshing(false);
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handleInvite = () => {
    // TODO: Replace with actual invite code and App Store links when available
    const inviteCode = 'PARTY2024'; // Dummy invite code
    const iosAppStoreLink = 'https://apps.apple.com/app/game-over/id123456789'; // Dummy iOS link
    const androidPlayStoreLink = 'https://play.google.com/store/apps/details?id=com.gameover.app'; // Dummy Android link
    const inviteUrl = `https://game-over.app/invite/${inviteCode}`;
    const inviteMessage = `Join my party planning on Game Over! 🎉\n\nUse invite code: ${inviteCode}\n\niOS: ${iosAppStoreLink}\nAndroid: ${androidPlayStoreLink}\n\nOr visit: ${inviteUrl}`;

    const tr = getTranslation();
    Alert.alert(
      tr.chat.shareInviteTitle,
      tr.chat.shareInviteMessage,
      [
        {
          text: 'WhatsApp',
          onPress: () => {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
            Linking.openURL(whatsappUrl).catch(() => {
              Alert.alert('Error', 'Could not open WhatsApp');
            });
          },
        },
        {
          text: 'Facebook',
          onPress: () => {
            const facebookUrl = `fb://facewebmodal/f?href=https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`;
            Linking.canOpenURL(facebookUrl).then(supported => {
              if (supported) {
                Linking.openURL(facebookUrl);
              } else {
                // Fallback to web version
                Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`);
              }
            });
          },
        },
        {
          text: 'Instagram',
          onPress: () => {
            Alert.alert(
              'Instagram',
              tr.chat.instagramMessage,
              [
                { text: tr.common.cancel, style: 'cancel' },
                {
                  text: tr.chat.openCamera,
                  onPress: () => {
                    Linking.openURL('instagram://story-camera').catch(() => {
                      // Fallback to Instagram app
                      Linking.openURL('instagram://').catch(() => {
                        // Final fallback to web
                        Linking.openURL('https://www.instagram.com/');
                      });
                    });
                  },
                },
              ]
            );
          },
        },
        {
          text: 'TikTok',
          onPress: () => {
            Linking.canOpenURL('tiktok://').then(supported => {
              if (supported) {
                Linking.openURL('tiktok://');
              } else {
                // Fallback to web version
                Linking.openURL('https://www.tiktok.com/');
              }
            });
          },
        },
        {
          text: tr.chat.moreOptions,
          onPress: async () => {
            try {
              await Share.share({
                message: 'Join my party planning on Game Over! 🎉\n\nDownload the app and use this invite link to join.',
                title: 'Join My Party Planning',
              });
            } catch (error) {
              Alert.alert('Error', 'Could not share the invite');
            }
          },
        },
        {
          text: tr.common.cancel,
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleAddChannel = (category: ChannelCategory) => {
    const tr = getTranslation();
    const categoryTitles: Record<ChannelCategory, string> = {
      general: tr.chat.general,
      accommodation: tr.chat.accommodation,
      activities: tr.chat.activities,
      budget: tr.chat.budgetCategory,
    };

    Alert.prompt(
      tr.chat.newChannelTitle.replace('{{category}}', categoryTitles[category]),
      tr.chat.newChannelMessage,
      [
        {
          text: tr.common.cancel,
          style: 'cancel',
        },
        {
          text: tr.chat.create,
          onPress: async (channelName?: string) => {
            if (channelName && channelName.trim()) {
              if (selectedEventId) {
                // Save to database if event exists
                try {
                  await createChannelMutation.mutateAsync({
                    event_id: selectedEventId,
                    name: channelName.trim(),
                    category,
                  });
                  Alert.alert(tr.budget.success, tr.chat.channelCreated);
                } catch (error) {
                  console.error('Failed to create channel:', error);
                  Alert.alert(tr.common.error, tr.chat.channelCreateFailed);
                }
              } else {
                // Save locally if no event
                setLocalSections(prevSections =>
                  prevSections.map(section =>
                    section.id === category
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: channelName.trim() }
                          ]
                        }
                      : section
                  )
                );
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleCreateNewTopic = () => {
    const tr = getTranslation();
    Alert.prompt(
      tr.chat.newTopicLabel,
      tr.chat.newTopicMessage,
      [
        {
          text: tr.common.cancel,
          style: 'cancel',
        },
        {
          text: tr.chat.create,
          onPress: async (topicName?: string) => {
            if (topicName && topicName.trim()) {
              if (selectedEventId) {
                // Save to database if event exists
                try {
                  await createChannelMutation.mutateAsync({
                    event_id: selectedEventId,
                    name: topicName.trim(),
                    category: 'general',
                  });
                  Alert.alert(tr.budget.success, tr.chat.topicCreated);
                } catch (error) {
                  console.error('Failed to create topic:', error);
                  Alert.alert(tr.common.error, tr.chat.topicCreateFailed);
                }
              } else {
                // Save locally if no event
                setLocalSections(prevSections =>
                  prevSections.map(section =>
                    section.id === 'general'
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: topicName.trim() }
                          ]
                        }
                      : section
                  )
                );
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const renderTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['chat', 'voting', 'decisions'] as CommunicationTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => switchTabAnimated(tab)}
            style={[
              styles.filterTab,
              selectedTab === tab && styles.filterTabActive,
            ]}
            testID={`tab-${tab}`}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedTab === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === 'chat' ? t.chat.tabChat : tab === 'voting' ? t.chat.tabVoting : t.chat.tabDecisions}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Selected event display name
  const selectedEvent = bookedEvents.find(e => e.id === selectedEventId);
  const selectedEventName = selectedEvent
    ? (selectedEvent.title || (selectedEvent.honoree_name ? `${selectedEvent.honoree_name}'s Event` : 'Event'))
    : ((t as any).chatSelector?.selectEvent || 'Select Event');

  const renderEventSelector = () => {
    if (bookedEvents.length === 0) return null;

    // Get city image for selected event
    const selectedCitySlug = selectedEvent?.city?.name?.toLowerCase() || 'berlin';
    const selectedCityImage = getEventImage(selectedCitySlug, selectedEvent?.hero_image_url);

    return (
      <View style={styles.eventSelectorWrapper}>
        <Pressable
          style={styles.eventSelectorCard}
          onPress={() => bookedEvents.length > 1 && setEventSelectorOpen(!eventSelectorOpen)}
          testID="event-selector"
        >
          {/* City thumbnail */}
          <Image
            source={resolveImageSource(selectedEvent?.hero_image_url || selectedCityImage)}
            style={styles.eventSelectorImage}
            resizeMode="cover"
          />
          <YStack flex={1} gap={2}>
            <Text style={styles.eventSelectorLabel}>
              {t.chat.currentEvent}
            </Text>
            <Text style={styles.eventSelectorName} numberOfLines={1}>
              {selectedEventName}
            </Text>
            {selectedEvent?.start_date && (
              <Text style={styles.eventSelectorDate}>
                {new Date(selectedEvent.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' \u2022 '}
                {selectedEvent.city?.name || ''}
              </Text>
            )}
          </YStack>
          {bookedEvents.length > 1 && (
            <View style={styles.eventSelectorChevron}>
              <Ionicons
                name={eventSelectorOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={DARK_THEME.textPrimary}
              />
            </View>
          )}
        </Pressable>

        {/* Dropdown */}
        {eventSelectorOpen && (
          <View style={styles.eventDropdown}>
            {[...bookedEvents]
              .sort((a, b) => {
                // Selected event always first
                if (a.id === selectedEventId) return -1;
                if (b.id === selectedEventId) return 1;
                // Then sort by date (nearest future first)
                const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
                const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
                return aDate - bDate;
              })
              .map(ev => {
              const isSelected = ev.id === selectedEventId;
              const evName = ev.title || (ev.honoree_name ? `${ev.honoree_name}'s Event` : 'Event');
              const evCitySlug = ev.city?.name?.toLowerCase() || 'berlin';
              const evCityImage = getEventImage(evCitySlug, ev.hero_image_url);
              return (
                <Pressable
                  key={ev.id}
                  style={[styles.eventDropdownItem, isSelected && styles.eventDropdownItemActive]}
                  onPress={() => {
                    setSelectedEventId(ev.id);
                    setEventSelectorOpen(false);
                  }}
                >
                  <Image
                    source={resolveImageSource(ev.hero_image_url || evCityImage)}
                    style={styles.eventDropdownImage}
                    resizeMode="cover"
                  />
                  <YStack flex={1} gap={1}>
                    <Text style={[
                      styles.eventDropdownText,
                      isSelected && styles.eventDropdownTextActive,
                    ]} numberOfLines={1}>
                      {evName}
                    </Text>
                    <Text style={styles.eventDropdownDate}>
                      {ev.city?.name || ''}
                      {ev.start_date ? ` \u2022 ${new Date(ev.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                  </YStack>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#5A7EB0" />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderShareEventCard = () => (
    <Pressable style={styles.shareEventCard} onPress={handleInvite}>
      <XStack alignItems="center" gap={10}>
        <View style={styles.shareEventIcon}>
          <Ionicons name="share-social-outline" size={18} color="#5A7EB0" />
        </View>
        <Text style={styles.shareEventTitle} numberOfLines={1} flex={1}>
          {t.chat.shareInvite} — {t.chat.inviteFriendsToJoin}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
      </XStack>
    </Pressable>
  );

  const renderChannelSection = (category: ChannelCategory, title: string) => {
    const categoryChannels = groupedChannels[category];

    return (
      <View key={category} style={styles.channelSection}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Pressable
            onPress={() => handleAddChannel(category)}
            style={styles.addButton}
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color="#5A7EB0" />
          </Pressable>
        </XStack>
        {categoryChannels.length > 0 ? (
          <YStack gap={8}>
            {categoryChannels.map((channel) => (
              <Pressable
                key={channel.id}
                style={styles.channelItem}
                onPress={() => {
                  router.push(`/(tabs)/chat/${channel.id}`);
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={DARK_THEME.textSecondary} />
                <Text style={styles.channelName}>{channel.name}</Text>
              </Pressable>
            ))}
          </YStack>
        ) : (
          <View style={styles.emptyChannelBox}>
            <Text style={styles.emptyChannelText}>{t.chat.noChannels}</Text>
          </View>
        )}
      </View>
    );
  };

  // Get user avatar or initials
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
          {/* Avatar and Title */}
          <XStack alignItems="center" gap={12}>
            <View style={styles.avatarContainer}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.headerTitle}>{t.chat.headerTitle}</Text>
          </XStack>

          {/* Notification Bell */}
          <Pressable
            onPress={handleNotifications}
            style={styles.notificationButton}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
        </XStack>

        {/* Tabs */}
        {renderTabs()}
      </View>

      {/* Event Selector */}
      {renderEventSelector()}

      {/* Content — swipe left/right to switch tabs */}
      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]} {...swipeHandlers}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 180 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={DARK_THEME.primary}
            colors={[DARK_THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Share Event Card */}
        {renderShareEventCard()}

        {bookedEvents.length === 0 ? (
          /* No event booked - show grayed out channels with overlay message */
          <>
          <View style={styles.lockedBanner}>
            <Ionicons name="lock-closed-outline" size={18} color={DARK_THEME.textSecondary} />
            <Text style={styles.lockedBannerText}>
              {t.chat.bookToUnlock}
            </Text>
          </View>
          <View style={{ opacity: 0.35, pointerEvents: 'none' as const }}>
            {renderChannelSection('general', t.chat.general.toUpperCase())}
            {renderChannelSection('accommodation', t.chat.accommodation.toUpperCase())}
            {renderChannelSection('activities', t.chat.activities.toUpperCase())}
            {renderChannelSection('budget', t.chat.budgetCategory.toUpperCase())}

            <View style={styles.channelSection}>
              <Text style={styles.sectionTitle}>{t.chat.newTopics}</Text>
              <Pressable style={styles.newTopicButton} onPress={handleCreateNewTopic}>
                <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
                <Text style={styles.newTopicText}>{t.chat.createNewTopic}</Text>
              </Pressable>
            </View>
          </View>
          </>
        ) : (
          /* Event booked - show active channels */
          <>
            {renderChannelSection('general', t.chat.general.toUpperCase())}
            {renderChannelSection('accommodation', t.chat.accommodation.toUpperCase())}
            {renderChannelSection('activities', t.chat.activities.toUpperCase())}
            {renderChannelSection('budget', t.chat.budgetCategory.toUpperCase())}

            <View style={styles.channelSection}>
              <Text style={styles.sectionTitle}>{t.chat.newTopics}</Text>
              <Pressable style={styles.newTopicButton} onPress={handleCreateNewTopic}>
                <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
                <Text style={styles.newTopicText}>{t.chat.createNewTopic}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: DARK_THEME.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  filterPill: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#5A7EB0',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  shareEventCard: {
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shareEventIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  channelSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChannelBox: {
    backgroundColor: 'rgba(45, 55, 72, 0.3)',
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChannelText: {
    fontSize: 13,
    color: DARK_THEME.textTertiary,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textPrimary,
    flex: 1,
  },
  newTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  newTopicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  lockedBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 55, 72, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // Event Selector — Prominent blue card with city image
  eventSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  eventSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#5A7EB0',
    borderRadius: 16,
    padding: 14,
  },
  eventSelectorImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  eventSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventSelectorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventSelectorDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventSelectorChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDropdown: {
    marginTop: 6,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  eventDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  eventDropdownItemActive: {
    backgroundColor: 'rgba(90, 126, 176, 0.12)',
  },
  eventDropdownImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  eventDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  eventDropdownTextActive: {
    color: '#5A7EB0',
    fontWeight: '700',
  },
  eventDropdownDate: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
  },
});

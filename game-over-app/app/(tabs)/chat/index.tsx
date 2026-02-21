/**
 * Communication Screen
 * Chat, Voting, Decisions with organized channel sections
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Animated, ScrollView, RefreshControl, Pressable, StyleSheet, View, StatusBar, Alert, Share, Linking, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useChannels, useCreateChannel } from '@/hooks/queries/useChat';
import { usePolls, useCreatePoll, useVote } from '@/hooks/queries/usePolls';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { useUser } from '@/stores/authStore';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import type { Database } from '@/lib/supabase/types';

// 10 icon options per category — best match chosen from channel name keywords
const CATEGORY_ICON_POOLS: Record<string, Array<{ icon: string; keywords: string[] }>> = {
  general: [
    { icon: 'chatbubbles',           keywords: ['chat', 'general', 'talk', 'discussion', 'lobby', 'main'] },
    { icon: 'megaphone',             keywords: ['announcement', 'news', 'update', 'info'] },
    { icon: 'people',                keywords: ['group', 'team', 'crew', 'gang', 'party', 'get together', 'gather'] },
    { icon: 'globe',                 keywords: ['travel', 'world', 'global', 'international', 'destination'] },
    { icon: 'heart',                 keywords: ['love', 'celebrate', 'cheer', 'congrats', 'wedding', 'birthday'] },
    { icon: 'star',                  keywords: ['vip', 'special', 'premium', 'highlight', 'best'] },
    { icon: 'flag',                  keywords: ['plan', 'goal', 'event', 'meeting', 'schedule'] },
    { icon: 'bulb',                  keywords: ['idea', 'tip', 'suggestion', 'advice', 'concept'] },
    { icon: 'trophy',                keywords: ['win', 'award', 'challenge', 'competition', 'game'] },
    { icon: 'compass',               keywords: ['explore', 'discover', 'adventure', 'trip', 'tour'] },
  ],
  accommodation: [
    { icon: 'bed',                   keywords: ['room', 'bed', 'sleep', 'suite', 'bedroom', 'allocation'] },
    { icon: 'home',                  keywords: ['villa', 'house', 'apartment', 'airbnb', 'home', 'rental'] },
    { icon: 'business',              keywords: ['hotel', 'hostel', 'resort', 'lodge'] },
    { icon: 'key',                   keywords: ['check-in', 'checkin', 'checkout', 'key', 'access', 'entry'] },
    { icon: 'location',              keywords: ['address', 'location', 'where', 'place', 'spot'] },
    { icon: 'map',                   keywords: ['map', 'directions', 'route', 'navigation'] },
    { icon: 'car',                   keywords: ['parking', 'car', 'transport', 'drive', 'shuttle'] },
    { icon: 'boat',                  keywords: ['boat', 'yacht', 'cruise', 'sailing', 'sea'] },
    { icon: 'airplane',              keywords: ['flight', 'airport', 'fly', 'airline', 'plane', 'arrival', 'departure'] },
    { icon: 'umbrella',              keywords: ['pool', 'beach', 'relax', 'spa', 'lounge'] },
  ],
  activities: [
    { icon: 'game-controller',       keywords: ['game', 'gaming', 'casino', 'poker', 'arcade'] },
    { icon: 'football',              keywords: ['football', 'soccer', 'sport', 'match', 'stadium'] },
    { icon: 'bicycle',               keywords: ['bike', 'cycling', 'karting', 'kart', 'race', 'go-kart'] },
    { icon: 'basketball',            keywords: ['basketball', 'court', 'hoops'] },
    { icon: 'golf',                  keywords: ['golf', 'tee', 'putting', 'green', 'course'] },
    { icon: 'fitness',               keywords: ['gym', 'fitness', 'workout', 'sports', 'paintball', 'laser'] },
    { icon: 'beer-outline',          keywords: ['bar', 'drinks', 'beer', 'pub', 'nightlife', 'club'] },
    { icon: 'restaurant',            keywords: ['dinner', 'restaurant', 'food', 'brunch', 'lunch', 'steak'] },
    { icon: 'ticket',                keywords: ['concert', 'show', 'event', 'theater', 'comedy', 'saturday', 'friday', 'night'] },
    { icon: 'camera',                keywords: ['photo', 'camera', 'shooting', 'memory', 'video'] },
  ],
  budget: [
    { icon: 'cash',                  keywords: ['cash', 'money', 'payment', 'pay', 'fund'] },
    { icon: 'card',                  keywords: ['card', 'credit', 'debit', 'stripe', 'deposit'] },
    { icon: 'wallet',                keywords: ['wallet', 'budget', 'spend', 'cost', 'expense'] },
    { icon: 'calculator',            keywords: ['calculate', 'total', 'split', 'share', 'per person'] },
    { icon: 'pie-chart',             keywords: ['breakdown', 'overview', 'summary', 'report'] },
    { icon: 'bar-chart',             keywords: ['tracking', 'progress', 'goal', 'target'] },
    { icon: 'trending-up',           keywords: ['update', 'change', 'increase', 'extra'] },
    { icon: 'receipt',               keywords: ['receipt', 'invoice', 'bill', 'reimbursement'] },
    { icon: 'pricetag',              keywords: ['price', 'fee', 'ticket', 'admission', 'entry'] },
    { icon: 'gift',                  keywords: ['gift', 'present', 'surprise', 'decoration', 'stag', 'bachelor'] },
  ],
};

function pickIconForChannel(channelName: string, category: string): string {
  const pool = CATEGORY_ICON_POOLS[category];
  if (!pool) return 'chatbubble-outline';
  const lower = channelName.toLowerCase();
  // Find best match by keyword
  for (const option of pool) {
    if (option.keywords.some(kw => lower.includes(kw))) {
      return option.icon;
    }
  }
  // Default: first icon in pool
  return pool[0].icon;
}

type CommunicationTab = 'topics' | 'voting';
type ChannelCategory = Database['public']['Enums']['channel_category'];

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];

type LocalChannel = {
  id: string;
  name: string;
  icon?: string;
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
  const [selectedTab, setSelectedTab] = useState<CommunicationTab>('topics');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollModalCategory, setPollModalCategory] = useState<ChannelCategory>('general');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const { t } = useTranslation();
  const COMM_TABS = ['topics', 'voting'] as const;
  const { handlers: swipeHandlers, animatedStyle: swipeAnimStyle, switchTab: switchTabAnimated } = useSwipeTabs(COMM_TABS, selectedTab, setSelectedTab);

  // Per-event local channel storage (keyed by eventId or 'none')
  const [localChannelsByEvent, setLocalChannelsByEvent] = useState<Record<string, LocalChannelSection[]>>({});

  // Persist localChannelsByEvent to AsyncStorage so channels survive navigation
  useEffect(() => {
    AsyncStorage.getItem('localChannelsByEvent').then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, LocalChannelSection[]>;
          setLocalChannelsByEvent(parsed);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    if (Object.keys(localChannelsByEvent).length > 0) {
      AsyncStorage.setItem('localChannelsByEvent', JSON.stringify(localChannelsByEvent)).catch(() => {});
    }
  }, [localChannelsByEvent]);

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

  // Poll hooks
  const { data: polls = [] } = usePolls(selectedEventId ?? undefined);
  const createPollMutation = useCreatePoll();
  const voteMutation = useVote();

  // Derived local sections for current event (per-event map)
  const DEFAULT_LOCAL_SECTIONS: LocalChannelSection[] = [
    { id: 'general', title: 'GENERAL', channels: [] },
    { id: 'accommodation', title: 'ACCOMMODATION', channels: [] },
    { id: 'activities', title: 'ACTIVITIES', channels: [] },
    { id: 'budget', title: 'BUDGET', channels: [] },
  ];
  const localSections = localChannelsByEvent[selectedEventId ?? 'none'] ?? DEFAULT_LOCAL_SECTIONS;

  const setLocalSectionsForEvent = (updater: (prev: LocalChannelSection[]) => LocalChannelSection[]) => {
    const key = selectedEventId ?? 'none';
    setLocalChannelsByEvent(prev => ({
      ...prev,
      [key]: updater(prev[key] ?? DEFAULT_LOCAL_SECTIONS),
    }));
  };

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
                } catch (error: any) {
                  // RLS policy violation (42501) — fall back to local-only channel
                  const code = error?.code || error?.message || '';
                  if (code === '42501' || String(code).includes('42501')) {
                    setLocalSectionsForEvent(prevSections =>
                      prevSections.map(section =>
                        section.id === category
                          ? {
                              ...section,
                              channels: [
                                ...section.channels,
                                { id: Date.now().toString(), name: channelName.trim(), icon: pickIconForChannel(channelName.trim(), category) }
                              ]
                            }
                          : section
                      )
                    );
                    Alert.alert(tr.budget.success, tr.chat.channelCreated);
                  } else {
                    console.error('Failed to create channel:', error);
                    Alert.alert(tr.common.error, tr.chat.channelCreateFailed);
                  }
                }
              } else {
                // Save locally if no event
                setLocalSectionsForEvent(prevSections =>
                  prevSections.map(section =>
                    section.id === category
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: channelName.trim(), icon: pickIconForChannel(channelName.trim(), category) }
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
                } catch (error: any) {
                  // RLS policy violation (42501) — fall back to local-only channel
                  const code = error?.code || error?.message || '';
                  if (code === '42501' || String(code).includes('42501')) {
                    setLocalSectionsForEvent(prevSections =>
                      prevSections.map(section =>
                        section.id === 'general'
                          ? {
                              ...section,
                              channels: [
                                ...section.channels,
                                { id: Date.now().toString(), name: topicName.trim(), icon: pickIconForChannel(topicName.trim(), 'general') }
                              ]
                            }
                          : section
                      )
                    );
                    Alert.alert(tr.budget.success, tr.chat.topicCreated);
                  } else {
                    console.error('Failed to create topic:', error);
                    Alert.alert(tr.common.error, tr.chat.topicCreateFailed);
                  }
                }
              } else {
                // Save locally if no event
                setLocalSectionsForEvent(prevSections =>
                  prevSections.map(section =>
                    section.id === 'general'
                      ? {
                          ...section,
                          channels: [
                            ...section.channels,
                            { id: Date.now().toString(), name: topicName.trim(), icon: pickIconForChannel(topicName.trim(), 'general') }
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

  const handleCreatePoll = (category: ChannelCategory) => {
    setPollModalCategory(category);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollModalVisible(true);
  };

  const handleSubmitPoll = async () => {
    if (!pollQuestion.trim() || !selectedEventId) return;
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) return;
    try {
      await createPollMutation.mutateAsync({
        poll: {
          event_id: selectedEventId,
          title: pollQuestion.trim(),
          category: pollModalCategory,
          status: 'active',
        },
        options: validOptions,
      });
      setPollModalVisible(false);
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const renderVotingTab = () => {
    if (bookedEvents.length === 0) {
      return (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={18} color={DARK_THEME.textSecondary} />
          <Text style={styles.lockedBannerText}>{t.chat.bookToUnlock}</Text>
        </View>
      );
    }

    const POLL_CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
      accommodation: { icon: 'bed',             color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
      activities:    { icon: 'game-controller', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
      budget:        { icon: 'cash',            color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
      general:       { icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    };

    const VOTING_CATEGORIES = [
      { id: 'general' as const,       label: 'GENERAL',       icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
      { id: 'accommodation' as const, label: 'ACCOMMODATION',  icon: 'bed',             color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
      { id: 'activities' as const,    label: 'ACTIVITIES',     icon: 'game-controller', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
      { id: 'budget' as const,        label: 'BUDGET',         icon: 'cash',            color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    ];

    const handleVote = async (pollId: string, optionId: string) => {
      try {
        await voteMutation.mutateAsync({ pollId, optionId });
      } catch {}
    };

    return (
      <>
        {VOTING_CATEGORIES.map(catDef => {
          const cfg = POLL_CATEGORY_CONFIG[catDef.id];
          const catPolls = polls.filter(p => p.category === catDef.id);
          return (
            <View key={catDef.id + catDef.label} style={styles.channelSection}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
                <Text style={styles.sectionTitle}>{catDef.label}</Text>
                <Pressable
                  onPress={() => handleCreatePoll(catDef.id)}
                  style={styles.newPollButton}
                  hitSlop={8}
                >
                  <Text style={styles.newPollButtonText}>New Poll</Text>
                  <Ionicons name="add-circle" size={18} color="#5A7EB0" />
                </Pressable>
              </XStack>
              {catPolls.length === 0 ? (
                <View style={styles.emptyChannelBox}>
                  <Text style={styles.emptyChannelText}>No polls yet</Text>
                </View>
              ) : (
                <YStack gap={12}>
                  {catPolls.map(poll => {
                    const totalVotes = poll.options?.reduce((sum, o) => sum + (o.vote_count ?? 0), 0) ?? 0;
                    const userVoted = !!poll.user_vote;
                    const statusColor = poll.status === 'active' ? '#10B981' : poll.status === 'closing_soon' ? '#F97316' : '#9CA3AF';
                    const statusBg   = poll.status === 'active' ? 'rgba(16,185,129,0.15)' : poll.status === 'closing_soon' ? 'rgba(249,115,22,0.15)' : 'rgba(156,163,175,0.15)';
                    return (
                      <View key={poll.id} style={styles.pollCard}>
                        <XStack alignItems="flex-start" gap={10} marginBottom={12}>
                          <View style={[styles.pollCategoryIcon, { backgroundColor: cfg.bg }]}>
                            <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                          </View>
                          <YStack style={{ flex: 1 }} gap={2}>
                            <Text style={styles.pollTitle}>{poll.title}</Text>
                          </YStack>
                          <View style={[styles.pollStatusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.pollStatusText, { color: statusColor }]}>
                              {poll.status === 'closing_soon' ? 'CLOSING SOON' : (poll.status ?? 'ACTIVE').toUpperCase()}
                            </Text>
                          </View>
                        </XStack>
                        <YStack gap={8} marginBottom={12}>
                          {(poll.options ?? []).map(opt => {
                            const pct = totalVotes > 0 ? Math.round(((opt.vote_count ?? 0) / totalVotes) * 100) : 0;
                            const isSelected = poll.user_vote === opt.id;
                            return (
                              <Pressable
                                key={opt.id}
                                style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
                                onPress={() => !userVoted && handleVote(poll.id, opt.id)}
                              >
                                <View style={[styles.pollRadio, isSelected && styles.pollRadioSelected]}>
                                  {isSelected && <View style={styles.pollRadioDot} />}
                                </View>
                                <Text style={[styles.pollOptionText, isSelected && { color: '#5A7EB0' }, { flex: 1 }]}>
                                  {opt.label}
                                </Text>
                                <Text style={[styles.pollPct, isSelected && { color: '#5A7EB0' }]}>{pct}%</Text>
                              </Pressable>
                            );
                          })}
                        </YStack>
                        <XStack justifyContent="space-between" alignItems="center">
                          <Text style={styles.pollFooter}>
                            {totalVotes} votes cast{poll.ends_at ? ` \u00b7 Ends ${new Date(poll.ends_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}
                          </Text>
                          {userVoted ? (
                            <XStack alignItems="center" gap={4}>
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                              <Text style={[styles.pollFooter, { color: '#10B981' }]}>You voted</Text>
                            </XStack>
                          ) : (
                            <Text style={[styles.pollFooter, { color: '#5A7EB0' }]}>Tap option to vote</Text>
                          )}
                        </XStack>
                      </View>
                    );
                  })}
                </YStack>
              )}
            </View>
          );
        })}
        <Pressable
          style={styles.newTopicButton}
          onPress={() => handleCreatePoll('general')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#5A7EB0" />
          <Text style={styles.newTopicText}>Create New Poll</Text>
        </Pressable>
      </>
    );
  };

  const renderTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['topics', 'voting'] as CommunicationTab[]).map((tab) => (
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
              {tab === 'topics' ? t.chat.tabChat : t.chat.tabVoting}
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

  const CHANNEL_CATEGORY_CONFIG: Record<ChannelCategory, { icon: string; color: string; bg: string }> = {
    general:       { icon: 'chatbubbles',     color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    accommodation: { icon: 'bed',             color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    activities:    { icon: 'game-controller', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
    budget:        { icon: 'cash',            color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  };

  const renderChannelSection = (category: ChannelCategory, title: string) => {
    const categoryChannels = groupedChannels[category];
    const catCfg = CHANNEL_CATEGORY_CONFIG[category];

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
            {categoryChannels.map((channel) => {
              const iconName = (channel as any).icon ?? pickIconForChannel(channel.name, category);
              return (
                <Pressable
                  key={channel.id}
                  style={styles.channelItem}
                  onPress={() => {
                    router.push(`/(tabs)/chat/${channel.id}?name=${encodeURIComponent(channel.name)}&category=${category}`);
                  }}
                >
                  <View style={[styles.channelIconWrap, { backgroundColor: catCfg.bg }]}>
                    <Ionicons name={iconName as any} size={16} color={catCfg.color} />
                  </View>
                  <Text style={styles.channelName}>{channel.name}</Text>
                </Pressable>
              );
            })}
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

        {selectedTab === 'topics' ? (
          /* Topics tab */
          bookedEvents.length === 0 ? (
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
          )
        ) : (
          /* Voting tab */
          renderVotingTab()
        )}
      </ScrollView>
      </Animated.View>

      {/* Poll Creation Modal */}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>New Poll</Text>
                <Text style={styles.modalLabel}>Question</Text>
                <TextInput
                  style={styles.modalInput}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  placeholder="What should we decide?"
                  placeholderTextColor={DARK_THEME.textTertiary}
                  multiline={false}
                />
                <Text style={styles.modalLabel}>Options</Text>
                {pollOptions.map((opt, i) => (
                  <TextInput
                    key={i}
                    style={styles.modalInput}
                    value={opt}
                    onChangeText={val => {
                      const updated = [...pollOptions];
                      updated[i] = val;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={DARK_THEME.textTertiary}
                  />
                ))}
                {pollOptions.length < 5 && (
                  <Pressable
                    onPress={() => setPollOptions(prev => [...prev, ''])}
                    style={styles.addOptionButton}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#5A7EB0" />
                    <Text style={styles.addOptionText}>Add Option</Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setPollModalVisible(false)}>
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.modalButtonCreate]} onPress={handleSubmitPoll}>
                    <Text style={styles.modalButtonCreateText}>Create Poll</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  channelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newPollButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  pollCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  pollCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  pollStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pollStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pollOptionSelected: {
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    borderColor: '#5A7EB0',
  },
  pollRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: DARK_THEME.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollRadioSelected: {
    borderColor: '#5A7EB0',
  },
  pollRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5A7EB0',
  },
  pollOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  pollPct: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_THEME.textTertiary,
  },
  pollFooter: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1E2329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK_THEME.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: DARK_THEME.textPrimary,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    marginBottom: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#5A7EB0',
    fontWeight: '500',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  modalButtonCreate: {
    backgroundColor: '#5A7EB0',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
  },
  modalButtonCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

/**
 * Share Event Screen — matches UI mockup 4.2
 * Event card + Copy Invite Link row + vertical social list with chevrons
 */

import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Linking, Alert, Share, ScrollView, View, Image as RNImage } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useCreateInvite } from '@/hooks/queries/useInvites';
import { DARK_THEME } from '@/constants/theme';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { getEventImage } from '@/constants/packageImages';

// Social platform config — each opens native app, falls back to web
const SOCIALS: Array<{
  key: string;
  label: string;
  bgColor: string;
  renderIcon: () => React.ReactNode;
  onPress: (msg: string, url: string) => Promise<void>;
}> = [
  {
    key: 'instagram',
    label: 'Instagram',
    bgColor: 'transparent',
    renderIcon: () => (
      <RNImage
        source={require('../../../assets/instagram-logo.png')}
        style={{ width: 48, height: 48 }}
        resizeMode="cover"
      />
    ),
    onPress: async () => {
      await Linking.openURL('instagram://story-camera').catch(() =>
        Linking.openURL('instagram://').catch(() =>
          Linking.openURL('https://www.instagram.com/')
        )
      );
    },
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    bgColor: '#25D366',
    renderIcon: () => <Ionicons name="logo-whatsapp" size={28} color="#FFFFFF" />,
    onPress: async (_msg, url) => {
      const text = encodeURIComponent(`${_msg}\n\n${url}`);
      const waUrl = `whatsapp://send?text=${text}`;
      const supported = await Linking.canOpenURL(waUrl).catch(() => false);
      await Linking.openURL(supported ? waUrl : `https://wa.me/?text=${text}`);
    },
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    bgColor: '#FFFFFF',
    renderIcon: () => (
      <RNImage
        source={require('../../../assets/tiktok-logo.png')}
        style={{ width: 30, height: 30 }}
        resizeMode="contain"
      />
    ),
    onPress: async () => {
      const supported = await Linking.canOpenURL('tiktok://').catch(() => false);
      await Linking.openURL(supported ? 'tiktok://' : 'https://www.tiktok.com/');
    },
  },
  {
    key: 'snapchat',
    label: 'Snapchat',
    bgColor: '#FFFC00',
    renderIcon: () => (
      <RNImage
        source={require('../../../assets/snapchat-logo.png')}
        style={{ width: 48, height: 48 }}
        resizeMode="cover"
      />
    ),
    onPress: async () => {
      const supported = await Linking.canOpenURL('snapchat://').catch(() => false);
      await Linking.openURL(supported ? 'snapchat://' : 'https://www.snapchat.com/');
    },
  },
  {
    key: 'facebook',
    label: 'Facebook',
    bgColor: '#1877F2',
    renderIcon: () => <Ionicons name="logo-facebook" size={28} color="#FFFFFF" />,
    onPress: async (_msg, url) => {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      const fbUrl = `fb://facewebmodal/f?href=${encodeURIComponent(shareUrl)}`;
      const supported = await Linking.canOpenURL(fbUrl).catch(() => false);
      await Linking.openURL(supported ? fbUrl : shareUrl);
    },
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    bgColor: '#000000',
    renderIcon: () => (
      <YStack alignItems="center" justifyContent="center">
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 26 }}>𝕏</Text>
      </YStack>
    ),
    onPress: async (_msg, url) => {
      const tweet = encodeURIComponent(`${_msg}\n${url}`);
      const twitterUrl = `twitter://post?message=${tweet}`;
      const supported = await Linking.canOpenURL(twitterUrl).catch(() => false);
      await Linking.openURL(
        supported ? twitterUrl : `https://twitter.com/intent/tweet?text=${tweet}`
      );
    },
  },
];

export default function ShareEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: event } = useEvent(id);
  const createInvite = useCreateInvite();
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const eventTitle = event?.title || (event?.honoree_name ? `${event.honoree_name}'s Event` : 'Event');
  const cityName = event?.city?.name || '';
  const startDate = event?.start_date ? new Date(event.start_date) : null;
  const endDate = event?.end_date ? new Date(event.end_date) : null;
  const isSameDay = startDate && endDate &&
    startDate.toDateString() === endDate.toDateString();
  const dateStr = startDate
    ? (!endDate || isSameDay)
      ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'TBD';

  const citySlug = event?.city?.name?.toLowerCase() || 'berlin';
  const heroImage = getEventImage(citySlug);

  const getInviteUrl = useCallback(async (): Promise<string> => {
    if (inviteCode) return `https://game-over.app/invite/${inviteCode}`;
    setIsGenerating(true);
    try {
      const invite = await createInvite.mutateAsync({ eventId: id! });
      setInviteCode(invite.code);
      return `https://game-over.app/invite/${invite.code}`;
    } finally {
      setIsGenerating(false);
    }
  }, [inviteCode, id, createInvite]);

  const handleCopyLink = async () => {
    try {
      const url = await getInviteUrl();
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Error', 'Could not generate invite link. Please try again.');
    }
  };

  const handleSocial = async (social: typeof SOCIALS[number]) => {
    try {
      const url = await getInviteUrl();
      const msg = `You're invited to "${eventTitle}"! 🎉`;
      await social.onPress(msg, url);
    } catch {
      Alert.alert('Error', `Could not open ${social.label}.`);
    }
  };

  const handleNativeShare = async () => {
    try {
      const url = await getInviteUrl();
      await Share.share({
        message: `You're invited to "${eventTitle}"! 🎉\n\n${url}`,
        title: eventTitle,
      });
    } catch {}
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Share Event</Text>
        <Pressable onPress={handleNativeShare} hitSlop={10} style={styles.headerRight}>
          <Ionicons name="share-outline" size={22} color={DARK_THEME.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Card */}
        <View style={styles.eventCard}>
          {/* Hero Image */}
          <View style={styles.heroImageContainer}>
            <KenBurnsImage source={heroImage} style={styles.heroImage} />
            {/* Gradient overlay */}
            <View style={styles.heroOverlay} />
            {/* Text over image */}
            <View style={styles.heroTextContainer}>
              <View style={styles.organizerBadge}>
                <Text style={styles.organizerText}>ORGANIZER</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{eventTitle}</Text>
              <XStack gap={12} alignItems="center" marginTop={4}>
                <XStack gap={5} alignItems="center">
                  <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.heroMeta}>{dateStr}</Text>
                </XStack>
                {cityName ? (
                  <>
                    <Text style={styles.heroMetaDot}>•</Text>
                    <XStack gap={5} alignItems="center">
                      <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.heroMeta}>{cityName}</Text>
                    </XStack>
                  </>
                ) : null}
              </XStack>
            </View>
          </View>
        </View>

        {/* Copy Invite Link */}
        <Pressable
          onPress={handleCopyLink}
          style={({ pressed }) => [styles.copyRow, pressed && { opacity: 0.75 }]}
          disabled={isGenerating}
        >
          <View style={styles.copyIconCircle}>
            <Ionicons name="link" size={20} color="#5A7EB0" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.copyTitle}>Copy Invite Link</Text>
          </View>
          <View style={styles.copyButton}>
            <Text style={[styles.copyButtonText, copied && styles.copyButtonTextDone]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </View>
        </Pressable>

        {/* Share to Socials */}
        <Text style={styles.sectionLabel}>Share to Socials</Text>

        <View style={styles.socialList}>
          {SOCIALS.map((social) => (
            <Pressable
              key={social.key}
              onPress={() => handleSocial(social)}
              style={({ pressed }) => [
                styles.socialRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={[styles.socialIconCircle, { backgroundColor: social.bgColor }]}>
                {social.renderIcon()}
              </View>
              <Text style={styles.socialLabel}>{social.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  headerRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  // Event card
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: DARK_THEME.surfaceCard,
  },
  heroImageContainer: {
    height: 200,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  organizerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  organizerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  heroMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  heroMetaDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  // Copy link
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  copyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(90,126,176,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 2,
  },
  copySubtitle: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
  },
  copyButton: {
    marginLeft: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(90,126,176,0.15)',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A7EB0',
  },
  copyButtonTextDone: {
    color: '#10B981',
  },
  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
    marginTop: 4,
  },
  // Social list — each item is its own free-floating pill card
  socialList: {
    gap: 10,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  socialIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  socialLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
});

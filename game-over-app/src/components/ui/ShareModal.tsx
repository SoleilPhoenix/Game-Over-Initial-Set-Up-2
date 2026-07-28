import React, { useCallback, useState } from 'react';
import { Modal, View, Pressable, Share, Linking, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useCreateInvite } from '@/hooks/queries/useInvites';

const PLATFORMS = [
  { id: 'whatsapp',  label: 'WhatsApp',    icon: 'logo-whatsapp',  color: '#25D366', bg: 'rgba(37,211,102,0.15)' },
  { id: 'instagram', label: 'Instagram',   icon: 'logo-instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.15)' },
  { id: 'tiktok',   label: 'TikTok',      icon: 'logo-tiktok',    color: '#FFFFFF', bg: 'rgba(255,255,255,0.1)' },
  { id: 'snapchat', label: 'Snapchat',    icon: 'camera-outline', color: '#FFFC00', bg: 'rgba(255,252,0,0.15)'  },
  { id: 'facebook', label: 'Facebook',    icon: 'logo-facebook',  color: '#1877F2', bg: 'rgba(24,119,242,0.15)' },
  { id: 'twitter',  label: 'X (Twitter)', icon: 'logo-twitter',   color: '#FFFFFF', bg: '#000000'               },
] as const;

type PlatformId = (typeof PLATFORMS)[number]['id'];

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  eventId?: string | null;
  eventTitle?: string;
}

// Platforms that don't support URL-in-deeplink — we copy the link and open the app
const CLIPBOARD_OPEN_PLATFORMS: PlatformId[] = ['instagram', 'tiktok', 'snapchat'];

const APP_SCHEMES: Record<string, string> = {
  instagram: 'instagram://',
  tiktok:   'tiktok://',
  snapchat: 'snapchat://',
};

const APP_FALLBACKS: Record<string, string> = {
  instagram: 'https://instagram.com',
  tiktok:   'https://tiktok.com',
  snapchat: 'https://snapchat.com',
};

export function ShareModal({ visible, onClose, eventId, eventTitle }: ShareModalProps) {
  const { theme } = useTheme();
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Lazy-generate an invite code on first share action, then cache it for the modal lifetime.
  // Never put the raw eventId into an /invite/ link — that URL will not resolve.
  const getInviteUrl = useCallback(async (): Promise<string | null> => {
    if (!eventId) return null;
    if (inviteCode) return `https://game-over.app/invite/${inviteCode}`;
    setIsGenerating(true);
    try {
      const invite = await createInvite.mutateAsync({ eventId });
      setInviteCode(invite.code);
      return `https://game-over.app/invite/${invite.code}`;
    } catch {
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [eventId, inviteCode, createInvite]);

  const handlePlatform = async (id: PlatformId) => {
    const shareUrl = await getInviteUrl();
    if (!shareUrl) {
      Alert.alert('Error', 'Could not generate invite link. Please try again.');
      return;
    }
    const shareMsg = `Join us for ${eventTitle ?? 'an unforgettable event'}! 🎉 ${shareUrl}`;

    try {
      if (CLIPBOARD_OPEN_PLATFORMS.includes(id)) {
        // Copy link to clipboard, then open the app (user pastes in-app)
        await Clipboard.setStringAsync(shareUrl);
        const scheme   = APP_SCHEMES[id];
        const fallback = APP_FALLBACKS[id];
        const canOpen  = await Linking.canOpenURL(scheme).catch(() => false);
        await Linking.openURL(canOpen ? scheme : fallback).catch(() => {});
        onClose();
        const appName = PLATFORMS.find(p => p.id === id)?.label ?? id;
        Alert.alert('Link copied!', `Paste it in ${appName} to share.`);
        return;
      }

      switch (id) {
        case 'whatsapp':
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMsg)}`);
          break;
        case 'facebook':
          await Linking.openURL(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
          );
          break;
        case 'twitter': {
          const tweet = encodeURIComponent(shareMsg);
          const canTw = await Linking.canOpenURL('twitter://').catch(() => false);
          await Linking.openURL(
            canTw ? `twitter://post?message=${tweet}` : `https://twitter.com/intent/tweet?text=${tweet}`
          );
          break;
        }
      }
    } catch {
      await Share.share({ message: shareMsg, url: shareUrl }).catch(() => {});
    }
    onClose();
  };

  const handleCopyLink = async () => {
    const shareUrl = await getInviteUrl();
    if (!shareUrl) {
      Alert.alert('Error', 'Could not generate invite link. Please try again.');
      return;
    }
    await Clipboard.setStringAsync(shareUrl).catch(() => {});
    onClose();
    Alert.alert('Link copied!', 'Paste it anywhere to share.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{
          backgroundColor: theme.surfaceCard,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 36,
          borderTopWidth: 1,
          borderColor: theme.ghostBorder,
        }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.ghostBorder, alignSelf: 'center', marginBottom: 20 }} />

          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.accentGold, textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_600SemiBold' }}>
            Share Event
          </Text>
          <Text style={{ fontSize: 13, color: theme.textTertiary, textAlign: 'center', marginBottom: 28 }}>
            Invite friends via your favourite platform
          </Text>

          {/* Platform grid — 3×2, icons fill available width */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 20 }}>
            {PLATFORMS.map(p => (
              <Pressable
                key={p.id}
                onPress={() => handlePlatform(p.id)}
                disabled={isGenerating}
                style={({ pressed }) => ({ alignItems: 'center', gap: 7, width: '30%', opacity: (pressed || isGenerating) ? 0.55 : 1 })}
              >
                <View style={{
                  width: 68, height: 68, borderRadius: 20,
                  backgroundColor: p.bg,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: theme.ghostBorder,
                }}>
                  {p.id === 'twitter'
                    ? <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', lineHeight: 28 }}>𝕏</Text>
                    : <Ionicons name={p.icon as any} size={30} color={p.color} />
                  }
                </View>
                <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '500' }}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Copy link — compact, filigree */}
          <Pressable
            onPress={handleCopyLink}
            disabled={isGenerating}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              opacity: (pressed || isGenerating) ? 0.55 : 1,
              paddingVertical: 8,
            })}
          >
            {isGenerating
              ? <ActivityIndicator size="small" color={theme.textTertiary} />
              : <Ionicons name="copy-outline" size={14} color={theme.textTertiary} />}
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textTertiary }}>
              {isGenerating ? 'Preparing link…' : 'Copy link'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

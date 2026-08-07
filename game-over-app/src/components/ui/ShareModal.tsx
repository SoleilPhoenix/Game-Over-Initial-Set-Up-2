import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Pressable, Share, Linking, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { useCreateInvite, useInvitesByEvent } from '@/hooks/queries/useInvites';
import { useTranslation } from '@/i18n';

// Module-level cache so the sheet re-opens instantly without re-hitting the DB.
// Keyed by eventId; the code stays valid until the invite's expiry (7 days by default).
const INVITE_CODE_CACHE = new Map<string, string>();

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
  const { t } = useTranslation();
  const createInvite = useCreateInvite();
  // Warm the invites cache as soon as we know the eventId — NOT only when the
  // modal opens. This turns the first modal-open into a cache hit instead of a
  // cold network round-trip, which is what made the sheet feel dead for
  // several seconds.
  const { data: existingInvites } = useInvitesByEvent(eventId ?? undefined);
  const [inviteCode, setInviteCode] = useState<string | null>(
    eventId ? INVITE_CODE_CACHE.get(eventId) ?? null : null
  );
  const [generating, setGenerating] = useState(false);
  // If the user taps a tile before the link resolves, we remember which one
  // and auto-execute it as soon as the link is ready — no more dead taps.
  const [pendingAction, setPendingAction] = useState<PlatformId | 'copy' | null>(null);
  const pendingActionRef = useRef<PlatformId | 'copy' | null>(null);
  useEffect(() => { pendingActionRef.current = pendingAction; }, [pendingAction]);

  // Get or create a shareable invite code.
  // Priority: (1) in-memory cache → (2) existing active invite in DB → (3) mint a new one.
  // `eventId` is the real event id — it must NEVER go into the link directly
  // (an event id is not a valid invite code and renders a dead "/invite/…" link).
  useEffect(() => {
    if (!eventId) return;

    // (1) already cached — nothing to do
    const cached = INVITE_CODE_CACHE.get(eventId);
    if (cached) {
      setInviteCode(cached);
      return;
    }

    // (2) reuse the newest active, unexpired invite for this event if one exists
    const now = Date.now();
    const reusable = existingInvites?.find(inv =>
      inv.is_active !== false &&
      new Date(inv.expires_at).getTime() > now &&
      (inv.max_uses === null || (inv.use_count ?? 0) < inv.max_uses)
    );
    if (reusable) {
      INVITE_CODE_CACHE.set(eventId, reusable.code);
      setInviteCode(reusable.code);
      return;
    }

    // (3) no reusable code and query has finished — mint a new one.
    // We only mint after the modal opens (avoids creating DB rows for events
    // the user never actually shared).
    if (!visible || existingInvites === undefined) return;
    let cancelled = false;
    setGenerating(true);
    createInvite
      .mutateAsync({ eventId })
      .then(invite => {
        if (cancelled) return;
        INVITE_CODE_CACHE.set(eventId, invite.code);
        setInviteCode(invite.code);
      })
      .catch(() => { if (!cancelled) setInviteCode(null); })
      .finally(() => { if (!cancelled) setGenerating(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createInvite is stable; re-run only on the listed deps
  }, [visible, eventId, existingInvites]);

  const linkReady = !!inviteCode;
  const shareUrl  = inviteCode ? `https://game-over.app/invite/${inviteCode}` : '';
  const shareMsg  = `Join us for ${eventTitle ?? 'an unforgettable event'}! 🎉 ${shareUrl}`;

  // Inline confirmation banner (replaces the intrusive OS Alert). Auto-clears.
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = (msg: string) => {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  };
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  // Reset queued action + feedback when the sheet closes.
  useEffect(() => {
    if (!visible) {
      setPendingAction(null);
      setFeedback(null);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    }
  }, [visible]);

  const handlePlatform = async (id: PlatformId) => {
    if (!linkReady) {
      setPendingAction(id);
      return;
    }
    const appName = PLATFORMS.find(p => p.id === id)?.label ?? id;
    try {
      if (CLIPBOARD_OPEN_PLATFORMS.includes(id)) {
        // Copy link to clipboard, then open the app (user pastes in-app)
        await Clipboard.setStringAsync(shareUrl);
        const scheme   = APP_SCHEMES[id];
        const fallback = APP_FALLBACKS[id];
        const canOpen  = await Linking.canOpenURL(scheme).catch(() => false);
        await Linking.openURL(canOpen ? scheme : fallback).catch(() => {});
        // Inline confirmation instead of a native alert; keep the sheet open
        // so it's visible when the user returns from the other app.
        showFeedback((t.chat as any).shareSwitchedTo.replace('{{platform}}', appName));
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
      showFeedback((t.chat as any).shareSwitchedTo.replace('{{platform}}', appName));
    } catch {
      await Share.share({ message: shareMsg, url: shareUrl }).catch(() => {});
    }
  };

  const handleCopyLink = async () => {
    if (!linkReady) {
      setPendingAction('copy');
      return;
    }
    await Clipboard.setStringAsync(shareUrl).catch(() => {});
    showFeedback((t.chat as any).shareLinkCopiedInline);
  };

  // As soon as the link resolves, auto-execute whatever the user tapped while waiting.
  useEffect(() => {
    if (!linkReady) return;
    const queued = pendingActionRef.current;
    if (!queued) return;
    setPendingAction(null);
    if (queued === 'copy') {
      handleCopyLink();
    } else {
      handlePlatform(queued);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers close over shareUrl; safe on link-ready flip
  }, [linkReady]);

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
            {(t.chat as any).shareEventTitle}
          </Text>
          <Text style={{ fontSize: 13, color: theme.textTertiary, textAlign: 'center', marginBottom: 28 }}>
            {(t.chat as any).shareEventSubtitleModal}
          </Text>

          {/* Platform grid — always at full opacity and always tappable.
              If the invite link hasn't resolved yet, the tapped tile is
              queued and auto-executed as soon as it's ready (see effect
              above). The tapped tile shows a small spinner overlay so the
              user knows their choice was registered. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', marginBottom: 20 }}>
            {PLATFORMS.map(p => {
              const isQueued = pendingAction === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => handlePlatform(p.id)}
                  style={({ pressed }) => ({ alignItems: 'center', gap: 7, width: '30%', opacity: pressed ? 0.75 : 1 })}
                >
                  <View style={{
                    width: 68, height: 68, borderRadius: 20,
                    backgroundColor: p.bg,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: isQueued ? theme.accentGold : theme.ghostBorder,
                  }}>
                    {p.id === 'twitter'
                      ? <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF', lineHeight: 28 }}>𝕏</Text>
                      : <Ionicons name={p.icon as any} size={30} color={p.color} />
                    }
                    {isQueued && (
                      <View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ActivityIndicator size="small" color={theme.accentGold} />
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '500' }}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Inline confirmation banner — discreet, replaces the OS alert */}
          {feedback && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
              backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 12,
              paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
            }}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#10B981', flexShrink: 1 }}>
                {feedback}
              </Text>
            </View>
          )}

          {/* Copy link — always tappable. If the link isn't ready yet the tap
              is queued and copies as soon as the code arrives. */}
          <Pressable
            onPress={handleCopyLink}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              opacity: pressed ? 0.65 : 1,
              paddingVertical: 8,
            })}
          >
            {pendingAction === 'copy' || (!linkReady && generating) ? (
              <ActivityIndicator size="small" color={theme.textTertiary} />
            ) : (
              <Ionicons name="copy-outline" size={14} color={theme.textTertiary} />
            )}
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textTertiary }}>
              {!linkReady && (generating || pendingAction) ? (t.chat as any).sharePreparingLink : (t.chat as any).shareCopyLink}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Invite Code Entry
 *
 * A guest who was invited to someone else's party has no reason to walk through
 * "plan the party" or to create an account first - they just have a code. This
 * offers that shortcut without competing with the primary call to action: it
 * stays a quiet one-line link until it is tapped, then unfolds into a field.
 *
 * It appears on both the welcome screen and the continue screen. Someone who
 * misses it on the first screen would otherwise be stuck picking a sign-in
 * provider they do not need, so the second screen has to offer the same way out.
 */

import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@/i18n';

interface InviteCodeEntryProps {
  /** Prefix for the testIDs, so both screens stay separately addressable in E2E. */
  testIDPrefix?: string;
  /** Lets an empty state reveal the field immediately while keeping the default link treatment elsewhere. */
  initiallyExpanded?: boolean;
  /** The marketing empty state supplies its own primary submit button. */
  showJoinButton?: boolean;
}

export interface InviteCodeEntryHandle {
  submit: () => void;
}

export const InviteCodeEntry = React.forwardRef<InviteCodeEntryHandle, InviteCodeEntryProps>(
function InviteCodeEntry(
  {
    testIDPrefix = 'invite-code',
    initiallyExpanded = false,
    showJoinButton = true,
  },
  ref,
) {
  const [expanded, setExpanded] = React.useState(initiallyExpanded);
  const [code, setCode] = React.useState('');
  const { t } = useTranslation();

  const handleJoin = React.useCallback(() => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/invite/${trimmed}`);
  }, [code]);

  React.useImperativeHandle(ref, () => ({ submit: handleJoin }), [handleJoin]);

  if (!expanded) {
    return (
      <Pressable
        style={styles.link}
        onPress={() => setExpanded(true)}
        hitSlop={8}
        testID={`${testIDPrefix}-link`}
      >
        <Ionicons name="ticket-outline" size={18} color="rgba(198,167,94,0.9)" />
        <Text style={styles.linkText}>{t.auth.gotInviteCode}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder={t.auth.inviteCodePlaceholder}
        placeholderTextColor="rgba(255,255,255,0.42)"
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={handleJoin}
        autoFocus
        testID={`${testIDPrefix}-input`}
      />
      {showJoinButton ? (
        <Pressable
          style={({ pressed }) => [
            styles.joinButton,
            pressed && { opacity: 0.8 },
            !code.trim() && { opacity: 0.5 },
          ]}
          onPress={handleJoin}
          disabled={!code.trim()}
          testID={`${testIDPrefix}-join`}
        >
          <Text style={styles.joinButtonText}>{t.auth.joinShort}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  linkText: {
    color: 'rgba(198,167,94,0.9)',
    fontSize: 15.5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  joinButton: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(198,167,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.5)',
  },
  joinButtonText: {
    color: '#C6A75E',
    fontSize: 15,
    fontWeight: '700',
  },
});

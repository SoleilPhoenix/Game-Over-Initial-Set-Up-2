/**
 * MessageInput Component
 * Input field for sending chat messages
 */

import React, { useState, useCallback } from 'react';
import { TextInput, StyleSheet, Keyboard, Platform } from 'react-native';
import { XStack, YStack, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { DARK_THEME } from '@/constants/theme';

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) return;

    onSend(trimmedMessage);
    setMessage('');
    Keyboard.dismiss();
  }, [message, onSend, isLoading, disabled]);

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <XStack
      paddingHorizontal="$3"
      paddingVertical="$2"
      backgroundColor="$surface"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      alignItems="flex-end"
      gap="$2"
    >
      {/* Input Container */}
      <XStack
        flex={1}
        backgroundColor="$background"
        borderRadius="$lg"
        borderWidth={1}
        borderColor={isFocused ? '$primary' : '$borderColor'}
        paddingHorizontal="$3"
        paddingVertical={Platform.OS === 'ios' ? '$2' : '$1'}
        alignItems="center"
        minHeight={44}
      >
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor={DARK_THEME.textTertiary}
          multiline
          maxLength={1000}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
          testID="message-input"
        />
      </XStack>

      {/* Send Button */}
      <YStack
        width={44}
        height={44}
        borderRadius="$full"
        backgroundColor={canSend ? '$primary' : '$borderColor'}
        alignItems="center"
        justifyContent="center"
        opacity={canSend ? 1 : 0.5}
        pressStyle={{ scale: 0.95, opacity: 0.8 }}
        onPress={handleSend}
        disabled={!canSend}
        testID="send-message-button"
      >
        {isLoading ? (
          <Spinner size="small" color="white" />
        ) : (
          <Ionicons
            name="send"
            size={20}
            color="white"
          />
        )}
      </YStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    color: DARK_THEME.textPrimary,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
});

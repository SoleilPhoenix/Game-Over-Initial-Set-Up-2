/**
 * MessageBubble Component
 * Displays a single chat message
 */

import React, { memo } from 'react';
import { YStack, XStack, Text, Avatar } from 'tamagui';
import { colors } from '@/constants/colors';
import type { MessageWithAuthor } from '@/repositories/messages';

interface MessageBubbleProps {
  message: MessageWithAuthor;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

function MessageBubbleComponent({
  message,
  isOwnMessage,
  showAvatar = true,
  showTimestamp = true,
}: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <XStack
      width="100%"
      justifyContent={isOwnMessage ? 'flex-end' : 'flex-start'}
      paddingHorizontal="$3"
      paddingVertical="$1"
      testID={isOwnMessage ? 'message-bubble-sent' : 'message-bubble-received'}
    >
      <XStack
        maxWidth="80%"
        gap="$2"
        flexDirection={isOwnMessage ? 'row-reverse' : 'row'}
        alignItems="flex-end"
      >
        {/* Avatar */}
        {showAvatar && !isOwnMessage && (
          <Avatar circular size="$3">
            {message.author?.avatar_url ? (
              <Avatar.Image src={message.author.avatar_url} />
            ) : (
              <Avatar.Fallback
                backgroundColor="$primary"
                delayMs={0}
              >
                <Text fontSize="$1" fontWeight="600" color="white">
                  {getInitials(message.author?.full_name || null)}
                </Text>
              </Avatar.Fallback>
            )}
          </Avatar>
        )}

        {/* Message Content */}
        <YStack maxWidth="100%">
          {/* Author name for others' messages */}
          {!isOwnMessage && showAvatar && message.author?.full_name && (
            <Text
              fontSize="$1"
              fontWeight="600"
              color="$textSecondary"
              marginBottom="$1"
              marginLeft="$2"
            >
              {message.author.full_name}
            </Text>
          )}

          {/* Bubble */}
          <YStack
            backgroundColor={isOwnMessage ? '$primary' : '$surface'}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$lg"
            borderBottomRightRadius={isOwnMessage ? '$sm' : '$lg'}
            borderBottomLeftRadius={isOwnMessage ? '$lg' : '$sm'}
            borderWidth={isOwnMessage ? 0 : 1}
            borderColor="$borderColor"
            elevation={isOwnMessage ? 0 : 1}
          >
            <Text
              fontSize="$3"
              color={isOwnMessage ? 'white' : '$textPrimary'}
              lineHeight={22}
            >
              {message.content}
            </Text>
          </YStack>

          {/* Timestamp */}
          {showTimestamp && (
            <Text
              fontSize={10}
              color="$textTertiary"
              marginTop="$1"
              textAlign={isOwnMessage ? 'right' : 'left'}
              marginHorizontal="$2"
              testID="message-timestamp"
            >
              {formatTime(message.created_at)}
            </Text>
          )}
        </YStack>

        {/* Spacer for own messages without avatar */}
        {isOwnMessage && showAvatar && <YStack width={28} />}
      </XStack>
    </XStack>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

/**
 * CreatePollModal Component
 * Modal for creating new polls
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import type { Database } from '@/lib/supabase/types';

type PollCategory = Database['public']['Tables']['polls']['Row']['category'];

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    question: string;
    category: PollCategory;
    options: string[];
    deadline?: Date;
  }) => Promise<void>;
  eventId: string;
}

const CATEGORIES: { value: PollCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'activities', label: 'Activities', icon: 'bicycle' },
  { value: 'accommodation', label: 'Accommodation', icon: 'bed' },
  { value: 'dining', label: 'Dining', icon: 'restaurant' },
  { value: 'budget', label: 'Budget', icon: 'wallet' },
  { value: 'general', label: 'General', icon: 'help-circle' },
];

export function CreatePollModal({
  visible,
  onClose,
  onSubmit,
  eventId,
}: CreatePollModalProps) {
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<PollCategory>('general');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setQuestion('');
    setCategory('general');
    setOptions(['', '']);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      Alert.alert('Maximum Options', 'You can add up to 6 options per poll.');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      Alert.alert('Minimum Options', 'A poll must have at least 2 options.');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!question.trim()) {
      Alert.alert('Missing Question', 'Please enter a question for your poll.');
      return false;
    }

    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      Alert.alert('Insufficient Options', 'Please provide at least 2 options.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const validOptions = options.filter((opt) => opt.trim().length > 0);
      await onSubmit({
        question: question.trim(),
        category,
        options: validOptions,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create poll:', error);
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID="create-poll-modal"
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top || 16}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          backgroundColor="$surface"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Pressable onPress={handleClose} style={styles.headerButton} testID="cancel-poll-button">
            <Text color="$primary" fontSize="$3">
              Cancel
            </Text>
          </Pressable>
          <Text flex={1} fontSize="$4" fontWeight="700" color="$textPrimary" textAlign="center">
            Create Poll
          </Text>
          <YStack width={60} />
        </XStack>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize="$2" fontWeight="600" color="$textSecondary">
              QUESTION
            </Text>
            <TextInput
              style={styles.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="What would you like to ask?"
              placeholderTextColor={colors.light.textTertiary}
              multiline
              maxLength={200}
              testID="poll-question-input"
            />
            <Text fontSize="$1" color="$textTertiary" textAlign="right">
              {question.length}/200
            </Text>
          </YStack>

          {/* Category */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize="$2" fontWeight="600" color="$textSecondary">
              CATEGORY
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    category === cat.value && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategory(cat.value)}
                  testID={`category-${cat.value}`}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={category === cat.value ? 'white' : colors.light.textSecondary}
                  />
                  <Text
                    fontSize="$2"
                    color={category === cat.value ? 'white' : '$textPrimary'}
                    fontWeight={category === cat.value ? '600' : '400'}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </XStack>
          </YStack>

          {/* Options */}
          <YStack gap="$2" marginBottom="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$2" fontWeight="600" color="$textSecondary">
                OPTIONS
              </Text>
              <Text fontSize="$1" color="$textTertiary">
                {options.length}/6
              </Text>
            </XStack>

            {options.map((option, index) => (
              <XStack key={index} gap="$2" alignItems="center">
                <YStack
                  width={24}
                  height={24}
                  borderRadius="$full"
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="$1" fontWeight="600" color="$textSecondary">
                    {index + 1}
                  </Text>
                </YStack>
                <TextInput
                  style={styles.optionInput}
                  value={option}
                  onChangeText={(value) => handleOptionChange(index, value)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={colors.light.textTertiary}
                  maxLength={100}
                  testID={`poll-option-${index}`}
                />
                {options.length > 2 && (
                  <Pressable
                    onPress={() => handleRemoveOption(index)}
                    style={styles.removeButton}
                    testID={`remove-option-${index}`}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.light.error} />
                  </Pressable>
                )}
              </XStack>
            ))}

            {options.length < 6 && (
              <Pressable style={styles.addOptionButton} onPress={handleAddOption} testID="add-option-button">
                <Ionicons name="add" size={20} color={colors.light.primary} />
                <Text color="$primary" fontWeight="500">
                  Add Option
                </Text>
              </Pressable>
            )}
          </YStack>
        </ScrollView>

        {/* Footer */}
        <YStack
          padding="$4"
          paddingBottom={insets.bottom + 16}
          backgroundColor="$surface"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            testID="submit-poll-button"
          >
            {isSubmitting ? (
              <XStack gap="$2" alignItems="center">
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="600">
                  Creating...
                </Text>
              </XStack>
            ) : (
              'Create Poll'
            )}
          </Button>
        </YStack>
      </YStack>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  questionInput: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 16,
    fontSize: 16,
    color: colors.light.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  optionInput: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 12,
    fontSize: 15,
    color: colors.light.textPrimary,
  },
  removeButton: {
    padding: 4,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.light.primary,
    backgroundColor: `${colors.light.primary}08`,
  },
});

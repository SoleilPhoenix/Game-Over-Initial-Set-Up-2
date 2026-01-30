/**
 * Profile Screen
 * User settings hub with dark glassmorphic theme
 */

import React from 'react';
import { Alert, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, useAuthStore } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';

interface MenuItemProps {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value?: string;
  showBadge?: boolean;
  onPress: () => void;
  testID?: string;
}

function MenuItem({
  icon,
  iconColor,
  iconBgColor,
  label,
  value,
  showBadge,
  onPress,
  testID,
}: MenuItemProps) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `, current value: ${value}` : ''}${showBadge ? ', has notification' : ''}`}
      accessibilityHint={`Opens ${label} settings`}
    >
      <XStack alignItems="center" gap="$3">
        <View
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={iconBgColor}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text color={DARK_THEME.textPrimary} fontSize={14} fontWeight="500">
          {label}
        </Text>
      </XStack>
      <XStack alignItems="center" gap="$2">
        {showBadge && (
          <View width={8} height={8} borderRadius={4} backgroundColor="#EF4444" />
        )}
        {value && (
          <Text color={DARK_THEME.textSecondary} fontSize={12}>
            {value}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </XStack>
    </Pressable>
  );
}

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
}

function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <YStack marginBottom="$5">
      <Text
        fontSize={11}
        fontWeight="600"
        color={DARK_THEME.textSecondary}
        textTransform="uppercase"
        letterSpacing={1}
        marginBottom="$3"
        marginLeft="$1"
      >
        {title}
      </Text>
      <View style={styles.glassCard}>
        {children}
      </View>
    </YStack>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const signOut = useAuthStore((state) => state.signOut);

  const userName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <View flex={1} backgroundColor={DARK_THEME.background} testID="profile-screen">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: insets.top + 16,
        }}
        showsVerticalScrollIndicator={false}
        testID="profile-scroll-view"
      >
        {/* Header Title */}
        <Text
          fontSize={24}
          fontWeight="700"
          color={DARK_THEME.textPrimary}
          textAlign="center"
          marginBottom="$6"
        >
          User Settings
        </Text>

        {/* Profile Card */}
        <YStack alignItems="center" marginBottom="$8">
          <Pressable
            onPress={() => router.push('/profile/edit')}
            testID="profile-avatar-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Profile picture for ${userName}. Tap to edit profile`}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[DARK_THEME.primary, '#60A5FA']}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text fontSize={24} fontWeight="700" color={DARK_THEME.textPrimary}>
                      {userInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color={DARK_THEME.primary} />
              </View>
            </View>
          </Pressable>
          <Text
            fontSize={20}
            fontWeight="700"
            color={DARK_THEME.textPrimary}
            marginTop="$4"
            testID="profile-user-name"
          >
            {userName}
          </Text>
          <Text fontSize={14} color={DARK_THEME.textSecondary} testID="profile-user-email">
            {userEmail}
          </Text>
        </YStack>

        <YStack paddingHorizontal="$4">
          {/* Notifications Section */}
          <MenuSection title="Notifications">
            <MenuItem
              icon="notifications"
              iconColor="#60A5FA"
              iconBgColor="rgba(96, 165, 250, 0.2)"
              label="Unified Feed"
              showBadge
              onPress={() => router.push('/profile/notifications')}
              testID="menu-notifications"
            />
          </MenuSection>

          {/* Account Section */}
          <MenuSection title="Account">
            <MenuItem
              icon="person"
              iconColor="#A78BFA"
              iconBgColor="rgba(167, 139, 250, 0.2)"
              label="Edit Profile"
              onPress={() => router.push('/profile/edit')}
              testID="menu-edit-profile"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="lock-closed"
              iconColor="#34D399"
              iconBgColor="rgba(52, 211, 153, 0.2)"
              label="Password & Security"
              onPress={() => router.push('/profile/security')}
              testID="menu-security"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="language"
              iconColor="#FB923C"
              iconBgColor="rgba(251, 146, 60, 0.2)"
              label="Language"
              value="English (US)"
              onPress={() => {/* Future: Language picker */}}
              testID="menu-language"
            />
          </MenuSection>

          {/* Wellness & Support Section */}
          <MenuSection title="Wellness & Support">
            <MenuItem
              icon="heart"
              iconColor="#F472B6"
              iconBgColor="rgba(244, 114, 182, 0.2)"
              label="Relationship Health Center"
              onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
              testID="menu-wellness"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="help-circle"
              iconColor="#9CA3AF"
              iconBgColor="rgba(156, 163, 175, 0.2)"
              label="Support & FAQ"
              onPress={() => {/* Future: Support screen */}}
              testID="menu-support"
            />
          </MenuSection>

          {/* Logout Button */}
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            testID="logout-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Log out of your account"
          >
            <Ionicons name="log-out-outline" size={18} color="#F87171" />
            <Text color="#F87171" fontSize={14} fontWeight="600">
              Log Out
            </Text>
          </Pressable>

          {/* Version */}
          <Text
            fontSize={10}
            color="#4B5563"
            textAlign="center"
            marginTop="$6"
          >
            Version 1.0.0 (Build 1)
          </Text>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: DARK_THEME.border,
    marginLeft: 56,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK_THEME.background,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: 8,
  },
});

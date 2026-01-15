/**
 * Profile Screen
 * User profile and settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing, layout, borderRadius } from '@/constants/spacing';
import { textStyles } from '@/constants/typography';
import { useUser, useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
  const user = useUser();
  const signOut = useAuthStore((state) => state.signOut);

  const menuItems = [
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'payment', label: 'Payment Methods', icon: '💳' },
    { id: 'help', label: 'Help & Support', icon: '❓' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.user_metadata?.full_name?.[0] ||
                user?.email?.[0]?.toUpperCase() ||
                '?'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable key={item.id} style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <Button variant="secondary" fullWidth onPress={signOut}>
            Sign Out
          </Button>
        </View>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.lg,
    backgroundColor: colors.light.surface,
  },
  title: {
    ...textStyles.h2,
    color: colors.light.textPrimary,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.light.surface,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    ...textStyles.h3,
    color: colors.light.textPrimary,
    marginBottom: spacing.xxs,
  },
  userEmail: {
    ...textStyles.body,
    color: colors.light.textSecondary,
  },
  menu: {
    backgroundColor: colors.light.surface,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: layout.screenPaddingHorizontal,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuLabel: {
    ...textStyles.body,
    color: colors.light.textPrimary,
    flex: 1,
  },
  menuArrow: {
    fontSize: 20,
    color: colors.light.textTertiary,
  },
  signOutContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    marginTop: spacing.lg,
  },
  version: {
    ...textStyles.caption,
    color: colors.light.textTertiary,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
});

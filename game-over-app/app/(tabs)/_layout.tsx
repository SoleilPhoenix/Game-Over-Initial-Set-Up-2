/**
 * Tabs Layout
 * Bottom tab navigation with central FAB for main app screens
 * Dark glassmorphic design matching UI specifications
 */

import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK_THEME } from '@/constants/theme';

type IconName = 'newspaper' | 'newspaper-outline' | 'chatbubble' | 'chatbubble-outline' |
  'wallet' | 'wallet-outline' | 'person' | 'person-outline' | 'add';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  // Handle both direct names and nested route names (e.g., "events" or "events/index")
  const routeKey = name.split('/')[0];

  const iconMap: Record<string, { active: IconName; inactive: IconName; label: string }> = {
    'events/index': { active: 'newspaper', inactive: 'newspaper-outline', label: 'Events' },
    'events': { active: 'newspaper', inactive: 'newspaper-outline', label: 'Events' },
    'chat': { active: 'chatbubble', inactive: 'chatbubble-outline', label: 'Kommunikation' },
    'budget/index': { active: 'wallet', inactive: 'wallet-outline', label: 'Budget' },
    'budget': { active: 'wallet', inactive: 'wallet-outline', label: 'Budget' },
    'profile': { active: 'person', inactive: 'person-outline', label: 'Profile' },
  };

  const icons = iconMap[routeKey] || iconMap[name] || { active: 'newspaper', inactive: 'newspaper-outline', label: name };
  const iconName = focused ? icons.active : icons.inactive;

  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={iconName}
        size={26}
        color={focused ? '#FFFFFF' : DARK_THEME.primary}
      />
      <Text style={[
        styles.tabLabel,
        { color: focused ? '#FFFFFF' : DARK_THEME.primary }
      ]}>
        {icons.label}
      </Text>
    </View>
  );
}

function FABButton() {
  const router = useRouter();

  const handlePress = () => {
    router.push('/create-event');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fabButton,
        pressed && styles.fabButtonPressed,
      ]}
      testID="fab-create-event"
    >
      <LinearGradient
        colors={[DARK_THEME.primary, '#3B5984']}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      <BlurView intensity={25} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.title || route.name;
            const isFocused = state.index === index;

            // Add space in the middle for FAB
            const isLeftSide = index < 2;
            const tabStyle = [
              styles.tabItem,
              isLeftSide ? styles.tabItemLeft : styles.tabItemRight,
            ];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID || `tab-${route.name}`}
                onPress={onPress}
                style={tabStyle}
              >
                <TabIcon name={route.name} focused={isFocused} />
              </Pressable>
            );
          })}
        </View>
      </BlurView>

      {/* Central FAB */}
      <FABButton />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="events/index"
        options={{
          title: 'Events',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
        }}
      />
      <Tabs.Screen
        name="budget/index"
        options={{
          title: 'Budget',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBarBlur: {
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 8 : 0,
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.glass,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemLeft: {
    marginRight: 32, // Space for FAB
  },
  tabItemRight: {
    marginLeft: 32, // Space for FAB
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 44,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  fabButton: {
    position: 'absolute',
    top: -24,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: DARK_THEME.background,
  },
});

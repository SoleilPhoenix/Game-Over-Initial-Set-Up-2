/**
 * Tabs Layout
 * Bottom tab navigation with central FAB for main app screens
 * Dark glassmorphic design matching UI specifications
 */

import { Tabs, useRouter } from 'expo-router';
import { Alert, View, StyleSheet, Pressable, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK_THEME } from '@/constants/theme';
import { useWizardStore } from '@/stores/wizardStore';
import { useTabBarStore } from '@/stores/tabBarStore';
import { useTranslation, getTranslation } from '@/i18n';

type IconName = 'calendar' | 'calendar-outline' | 'chatbubbles' | 'chatbubbles-outline' |
  'card' | 'card-outline' | 'person-circle' | 'person-circle-outline' | 'add';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { t } = useTranslation();
  const iconMap: Record<string, { active: IconName; inactive: IconName }> = {
    events: { active: 'calendar', inactive: 'calendar-outline' },
    chat: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
    budget: { active: 'card', inactive: 'card-outline' },
    profile: { active: 'person-circle', inactive: 'person-circle-outline' },
  };
  const labelMap: Record<string, string> = {
    events: t.tabs.events,
    chat: t.tabs.chat,
    budget: t.tabs.budget,
    profile: t.tabs.profile,
  };

  const config = iconMap[name] || { active: 'calendar', inactive: 'calendar-outline' };
  const label = labelMap[name] || name;
  const iconName = focused ? config.active : config.inactive;
  const activeColor = '#5A7EB0'; // Same as Share Event card

  return (
    <View style={styles.iconContainer}>
      <Ionicons
        name={iconName}
        size={22}
        color={focused ? activeColor : DARK_THEME.textSecondary}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? activeColor : DARK_THEME.textSecondary }
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function FABButton() {
  const router = useRouter();

  const handlePress = () => {
    const store = useWizardStore.getState();
    if (store.hasDraft()) {
      const tr = getTranslation();
      Alert.alert(
        tr.wizard.existingDraftTitle,
        tr.wizard.existingDraftMessage,
        [
          { text: tr.wizard.cancel, style: 'cancel' },
          {
            text: tr.wizard.continueDraft,
            onPress: () => {
              const drafts = store.getAllDrafts();
              if (drafts.length > 0) {
                store.loadDraft(drafts[0].id);
                const stepPaths = ['/create-event', '/create-event/preferences', '/create-event/participants', '/create-event/packages'];
                const targetPath = stepPaths[Math.min(drafts[0].currentStep - 1, 3)];
                router.push(targetPath as any);
              }
            },
          },
          {
            text: tr.wizard.startFresh,
            style: 'destructive',
            onPress: () => {
              store.startNewDraft();
              router.push('/create-event');
            },
          },
        ]
      );
      return;
    }
    store.startNewDraft();
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
        colors={['#5A7EB0', '#4A6E9F']}
        style={styles.fabGradient}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHidden = useTabBarStore((s) => s.hidden);

  // Hide tab bar on chat detail screens (chat/[channelId])
  const currentRoute = state.routes[state.index];
  const innerRoute = currentRoute?.state?.routes?.[currentRoute?.state?.index ?? 0];

  const isChannelDetailScreen = currentRoute?.name === 'chat' &&
    innerRoute?.name?.includes('[channelId]');

  // Recursively check if any nested route has an eventId param
  const routeHasEventId = (route: any): boolean => {
    if (!route) return false;
    if ((route.params as any)?.eventId) return true;
    if (route.state?.routes) return route.state.routes.some(routeHasEventId);
    return false;
  };

  // Hide tab bar when chat or budget opened from Event Summary (eventId param present)
  const isChatFromEventSummary = currentRoute?.name === 'chat' && routeHasEventId(currentRoute);
  const isBudgetFromEventSummary = currentRoute?.name === 'budget' && routeHasEventId(currentRoute);

  if (tabBarHidden || isChannelDetailScreen || isChatFromEventSummary || isBudgetFromEventSummary) {
    return null;
  }

  // Define the correct order of tabs
  const tabOrder = ['events', 'chat', 'budget', 'profile'];

  // Filter and sort routes according to our desired order
  const sortedRoutes = state.routes
    .filter((route: any) => {
      const routeName = route.name.split('/')[0]; // Extract base name
      return tabOrder.includes(routeName);
    })
    .sort((a: any, b: any) => {
      const aName = a.name.split('/')[0];
      const bName = b.name.split('/')[0];
      return tabOrder.indexOf(aName) - tabOrder.indexOf(bName);
    });

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {/* Solid background to fully cover content underneath */}
      <View style={styles.tabBarBackground} />
      <BlurView intensity={25} tint="dark" style={styles.tabBarBlur}>
        <View style={styles.tabBarInner}>
          {sortedRoutes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const routeName = route.name.split('/')[0]; // Get base name without /index
            const isFocused = state.index === state.routes.indexOf(route);

            // Add space in the middle for FAB (after first 2 tabs)
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
                testID={options.tabBarTestID || `tab-${routeName}`}
                onPress={onPress}
                style={tabStyle}
              >
                <TabIcon name={routeName} focused={isFocused} />
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
        sceneStyle: {
          backgroundColor: DARK_THEME.background,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          href: '/(tabs)/events',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          href: '/(tabs)/chat',
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          href: '/(tabs)/budget',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: '/(tabs)/profile',
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
    zIndex: 1000, // Ensure tab bar is on top
  },
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // Cover more area
    backgroundColor: 'rgba(21, 24, 29, 0.85)', // 85% opacity (between 30-50% transparency = 50-70% opacity)
    zIndex: 1,
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
    zIndex: 2, // Above background
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
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
    width: 72,
    height: 42,
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  fabButton: {
    position: 'absolute',
    top: -24,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#5A7EB0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001, // Above tab bar (tabBarContainer is 1000)
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

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { useT } from '@/i18n/useT';
import { Colors, FontFamily } from '@/theme/tokens';

// Settings §2: "Report issue" moves to the center of the bottom bar as an
// elevated button (replaces the floating FAB that used to live on Home).
function ReportTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={accessibilityState}
      style={styles.reportWrap}
      hitSlop={8}>
      <View style={styles.reportCircle}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 12.5, fontFamily: FontFamily.semibold, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingTop: 6,
          height: 88,
        },
        tabBarItemStyle: { paddingTop: 4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color }) => <Ionicons name="home" size={26} color={color} />,
        }}
      />
      {/* Settings §2: center position, elevated button, no standard label/icon */}
      <Tabs.Screen
        name="report"
        options={{
          title: t('tabCreate'),
          tabBarButton: ReportTabButton,
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: t('tabMyReports'),
          tabBarIcon: ({ color }) => <Ionicons name="list" size={26} color={color} />,
        }}
      />
      {/* Settings §2: Profile is removed from the bottom bar; still a navigable
          route reached from the Home avatar. */}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  reportWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  reportCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

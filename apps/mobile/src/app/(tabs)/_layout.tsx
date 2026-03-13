/**
 * Bottom-tab navigator — 5 tabs with custom styling.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';

import { Colors, FontSize, Spacing } from '@/lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ITEMS: { name: string; title: string; icon: IoniconsName; iconActive: IoniconsName }[] = [
  { name: 'home', title: 'Inicio', icon: 'home-outline', iconActive: 'home' },
  { name: 'forms', title: 'Formularios', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'incidents', title: 'Incidentes', icon: 'warning-outline', iconActive: 'warning' },
  { name: 'actions', title: 'Acciones', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
  { name: 'more', title: 'Más', icon: 'ellipsis-horizontal-outline', iconActive: 'ellipsis-horizontal' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
    height: Platform.OS === 'ios' ? 88 : 64,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/theme';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Özet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="motors/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Motorlar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="parts/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" label="Parçalar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="marketplace/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" label="Pazar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="maintenance/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛠️" label="Bakım" focused={focused} />,
        }}
      />
      {/* Hidden routes — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen name="motors/create" options={{ href: null }} />
      <Tabs.Screen name="motors/[id]" options={{ href: null }} />
      <Tabs.Screen name="maintenance/create" options={{ href: null }} />
      <Tabs.Screen name="parts/create" options={{ href: null }} />
      <Tabs.Screen name="parts/[id]" options={{ href: null }} />
      <Tabs.Screen name="marketplace/create" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 8,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    minWidth: 60,
  },
  tabIconFocused: {},
  emoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  tabLabelFocused: { color: Colors.primary, fontWeight: '600' },
});

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useTabStore } from '../../src/store/tab.store';
import { LayoutDashboard, Wrench, Package, Store } from 'lucide-react-native';

import DashboardTab from '../../src/components/tabs/DashboardTab';
import MaintenanceTab from '../../src/components/tabs/MaintenanceTab';
import PartsTab from '../../src/components/tabs/PartsTab';
import MarketplaceTab from '../../src/components/tabs/MarketplaceTab';

const TABS = [
  { key: 'dashboard', label: 'Özet', Icon: LayoutDashboard },
  { key: 'maintenance', label: 'Tamir', Icon: Wrench },
  { key: 'parts', label: 'Parçalar', Icon: Package },
  { key: 'marketplace', label: 'Pazar', Icon: Store },
];

export default function MainTabs() {
  const { colors } = useAppTheme();
  const { activeTab, setActiveTab } = useTabStore();
  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    pagerRef.current?.setPage(activeTab);
  }, [activeTab]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
      >
        <View key="1" style={{ flex: 1 }}>
          <DashboardTab />
        </View>
        <View key="2" style={{ flex: 1 }}>
          <MaintenanceTab />
        </View>
        <View key="3" style={{ flex: 1 }}>
          <PartsTab />
        </View>
        <View key="4" style={{ flex: 1 }}>
          <MarketplaceTab />
        </View>
      </PagerView>

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {TABS.map((tab, index) => {
          const isFocused = activeTab === index;
          const color = isFocused ? colors.primary : colors.textMuted;
          const Icon = tab.Icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(index)}
              activeOpacity={0.7}
            >
              {isFocused && (
                <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
              )}
              <Icon size={24} color={color} />
              <Text style={[styles.tabLabel, { color, fontWeight: isFocused ? '700' : '400' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  indicator: {
    position: 'absolute',
    top: -1,
    left: '20%',
    right: '20%',
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  }
});

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { AuthFlowScreen } from './src/screens/AuthScreens';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { IrrigationScreen } from './src/screens/IrrigationScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { SensorsScreen } from './src/screens/SensorsScreen';

const TAB_TITLES = [
  'Tổng quan nông trại',
  'Điều khiển tưới tiêu',
  'Cảm biến & Biểu đồ',
  'Cảnh báo vượt ngưỡng',
  'Quản trị & Báo cáo',
];

function MainShell() {
  const { initializing, user, activeAlertCount } = useApp();
  const [tab, setTab] = useState(0);
  const [pendingSensorId, setPendingSensorId] = useState<string | null>(null);

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  if (!user) {
    return <AuthFlowScreen />;
  }

  const navItems: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    badge?: number;
  }> = [
    { label: 'Tổng quan', icon: 'grid-outline', activeIcon: 'grid' },
    { label: 'Tưới tiêu', icon: 'water-outline', activeIcon: 'water' },
    { label: 'Cảm biến', icon: 'analytics-outline', activeIcon: 'analytics' },
    {
      label: 'Cảnh báo',
      icon: 'notifications-outline',
      activeIcon: 'notifications',
      badge: activeAlertCount,
    },
    { label: 'Quản lý', icon: 'menu-outline', activeIcon: 'menu' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <View style={styles.topIconBox}>
          <Ionicons name="leaf" size={17} color="#15803D" />
        </View>
        <Text style={styles.topTitle}>{TAB_TITLES[tab]}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 0 && (
          <DashboardScreen
            onNavigateTab={setTab}
            onOpenSensorChart={(sensorId) => {
              setPendingSensorId(sensorId);
              setTab(2);
            }}
          />
        )}
        {tab === 1 && <IrrigationScreen />}
        {tab === 2 && (
          <SensorsScreen
            initialSensorId={pendingSensorId}
            onConsumeInitialSensor={() => setPendingSensorId(null)}
          />
        )}
        {tab === 3 && <AlertsScreen />}
        {tab === 4 && <MoreScreen />}
      </View>

      <View style={styles.bottomBar}>
        {navItems.map((item, idx) => {
          const active = tab === idx;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => setTab(idx)}
              style={styles.navBtn}
              activeOpacity={0.8}
            >
              <View style={[styles.navIconPill, active && styles.navIconPillActive]}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={20}
                  color={active ? '#15803D' : '#64748B'}
                />
                {Boolean(item.badge && item.badge > 0) && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <MainShell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
    paddingBottom: 10,
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  navIconPillActive: {
    backgroundColor: '#DCFCE7',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    right: 4,
    top: -2,
    backgroundColor: '#DC2626',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
});

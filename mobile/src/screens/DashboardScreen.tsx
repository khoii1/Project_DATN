import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  InlineErrorCard,
  PumpControlCard,
  SensorReadingCard,
  StatTile,
  StatusBadge,
} from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { smartAgriApi } from '../services/api';
import type {
  ActivityLogModel,
  ActuatorModel,
  AlertModel,
  AlertSummaryModel,
  AutomationRuleModel,
  DeviceSummaryModel,
  FarmModel,
  ZoneLatestSensorModel,
  ZoneModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function DashboardScreen({
  onNavigateTab,
  onOpenSensorChart,
}: {
  onNavigateTab: (tab: number) => void;
  onOpenSensorChart?: (sensorId: string) => void;
}) {
  const { user, refreshAlertBadge, showSuccess, showError } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [pumpBusy, setPumpBusy] = useState(false);
  const [error, setError] = useState('');

  const [farms, setFarms] = useState<FarmModel[]>([]);
  const [zones, setZones] = useState<ZoneModel[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const [deviceSummary, setDeviceSummary] = useState<DeviceSummaryModel>({
    total: 0,
    active: 0,
    online: 0,
    offline: 0,
    unknown: 0,
  });
  const [alertSummary, setAlertSummary] = useState<AlertSummaryModel>({
    active: 0,
    open: 0,
    acknowledged: 0,
    critical: 0,
    warning: 0,
    resolvedToday: 0,
  });
  const [latestSensors, setLatestSensors] = useState<ZoneLatestSensorModel[]>([]);
  const [pumps, setPumps] = useState<ActuatorModel[]>([]);
  const [rules, setRules] = useState<AutomationRuleModel[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertModel[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLogModel[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const fPage = await smartAgriApi.listFarms({ status: 'ACTIVE', limit: 100 });
        setFarms(fPage.items);
        if (fPage.items.length > 0) {
          const fid = fPage.items[0].id;
          setSelectedFarmId(fid);
          const zPage = await smartAgriApi.listZones({
            farmId: fid,
            status: 'ACTIVE',
            limit: 100,
          });
          setZones(zPage.items);
          if (zPage.items.length > 0) {
            setSelectedZoneId(zPage.items[0].id);
          }
        }
      } catch (e) {
        setError(AppFormatters.friendlyError(e));
      }
    })();
  }, []);

  const loadLive = useCallback(
    async (silent = true) => {
      if (!silent) setRefreshing(true);
      try {
        const [devSum, alSum, alList, logList] = await Promise.all([
          smartAgriApi.deviceSummary({
            farmId: selectedFarmId || undefined,
            zoneId: selectedZoneId || undefined,
          }),
          smartAgriApi.alertSummary(),
          smartAgriApi.listAlerts({ active: true, limit: 4 }),
          smartAgriApi.listActivityLogs({ limit: 4 }),
        ]);

        setDeviceSummary(devSum);
        setAlertSummary(alSum);
        setRecentAlerts(alList.items);
        setRecentLogs(logList.items);

        if (selectedZoneId) {
          const [zSensors, zPumps, zRules] = await Promise.all([
            smartAgriApi.zoneLatestReadings(selectedZoneId),
            smartAgriApi.listActuators({
              zoneId: selectedZoneId,
              type: 'PUMP',
              limit: 20,
            }),
            smartAgriApi.listAutomationRules({
              zoneId: selectedZoneId,
              limit: 50,
            }),
          ]);
          setLatestSensors(zSensors);
          setPumps(zPumps.items);
          setRules(zRules.items);
        }
        setError('');
        void refreshAlertBadge();
      } catch (e) {
        if (!silent) setError(AppFormatters.friendlyError(e));
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [selectedFarmId, selectedZoneId, refreshAlertBadge],
  );

  useEffect(() => {
    void loadLive(false);
    const timer = setInterval(() => {
      void loadLive(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadLive]);

  const ruleForActuator = (actuatorId: string) =>
    rules.find((r) => r.actuatorId === actuatorId && r.enabled) ||
    rules.find((r) => r.actuatorId === actuatorId) ||
    null;

  const confirmAndSendCommand = (
    actuator: ActuatorModel,
    command: 'TURN_ON' | 'TURN_OFF',
  ) => {
    const label = command === 'TURN_ON' ? 'Bật máy bơm' : 'Tắt máy bơm';
    const execute = async () => {
      setPumpBusy(true);
      try {
        await smartAgriApi.issueCommand(actuator.id, command);
        showSuccess(`Đã gửi yêu cầu ${label.toLowerCase()} (${actuator.name})`);
        await loadLive(true);
      } catch (e) {
        showError(e);
      } finally {
        setPumpBusy(false);
      }
    };

    if (Platform.OS === 'web') {
      void execute();
      return;
    }

    Alert.alert(
      `${label}?`,
      command === 'TURN_ON'
        ? `${actuator.name} sẽ bắt đầu tưới cho đến khi bạn nhấn Tắt.`
        : `Dừng ${actuator.name} ngay bây giờ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: label, onPress: () => void execute() },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadLive(false)} />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Xin chào, {user?.fullName ?? ''}</Text>
            <Text style={styles.heroSub}>
              {AppFormatters.roleLabel(user?.role)} · Tự động cập nhật mỗi 5 giây
            </Text>
          </View>
          <View style={styles.livePill}>
            <Ionicons name="radio-button-on" size={12} color="#FDE047" />
            <Text style={styles.livePillText}>Trực tuyến</Text>
          </View>
        </View>

        {zones.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
          >
            {zones.map((z) => (
              <TouchableOpacity
                key={z.id}
                onPress={() => setSelectedZoneId(z.id)}
                style={[
                  styles.zoneChip,
                  selectedZoneId === z.id && styles.zoneChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.zoneChipText,
                    selectedZoneId === z.id && styles.zoneChipTextActive,
                  ]}
                >
                  {z.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {error ? (
        <InlineErrorCard error={error} onRetry={() => void loadLive(false)} />
      ) : null}

      <View style={styles.statRow}>
        <StatTile
          label="Thiết bị trực tuyến"
          value={`${deviceSummary.online}/${deviceSummary.total}`}
          subtitle={`${deviceSummary.offline} ngoại tuyến`}
          icon="hardware-chip-outline"
          color="#16A34A"
        />
        <StatTile
          label="Cảnh báo đang mở"
          value={`${alertSummary.active}`}
          subtitle={`${alertSummary.critical} nghiêm trọng`}
          icon="warning-outline"
          color={alertSummary.active > 0 ? '#DC2626' : '#2563EB'}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chỉ số cảm biến hiện tại</Text>
        <TouchableOpacity onPress={() => onNavigateTab(2)}>
          <Text style={styles.sectionLink}>Xem biểu đồ →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sensorGrid}>
        {latestSensors.map((s) => (
          <SensorReadingCard
            key={s.sensorId}
            name={s.name}
            type={s.type}
            unit={s.unit}
            value={s.value}
            recordedAt={s.recordedAt}
            onPress={() =>
              onOpenSensorChart
                ? onOpenSensorChart(s.sensorId)
                : onNavigateTab(2)
            }
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Điều khiển tưới nhanh</Text>
        <TouchableOpacity onPress={() => onNavigateTab(1)}>
          <Text style={styles.sectionLink}>Quản lý tưới →</Text>
        </TouchableOpacity>
      </View>

      {pumps.map((pump) => {
        const rule = ruleForActuator(pump.id);
        return (
          <PumpControlCard
            key={pump.id}
            actuator={pump}
            rule={rule}
            busy={pumpBusy}
            onCommand={(cmd) => confirmAndSendCommand(pump, cmd)}
            onToggleAuto={
              rule
                ? async () => {
                    try {
                      await smartAgriApi.updateAutomationRule(rule.id, {
                        enabled: !rule.enabled,
                      });
                      showSuccess(
                        rule.enabled
                          ? 'Đã tắt chế độ tưới tự động'
                          : 'Đã bật chế độ tưới tự động',
                      );
                      await loadLive(true);
                    } catch (e) {
                      showError(e);
                    }
                  }
                : undefined
            }
            onResumeAuto={
              rule
                ? async () => {
                    try {
                      await smartAgriApi.updateAutomationRule(rule.id, {
                        enabled: true,
                      });
                      showSuccess('Đã chuyển về chế độ tưới tự động');
                      await loadLive(true);
                    } catch (e) {
                      showError(e);
                    }
                  }
                : undefined
            }
          />
        );
      })}

      {recentAlerts.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cảnh báo cần chú ý</Text>
            <TouchableOpacity onPress={() => onNavigateTab(3)}>
              <Text style={styles.sectionLink}>Tất cả →</Text>
            </TouchableOpacity>
          </View>
          {recentAlerts.map((a) => (
            <View key={a.id} style={styles.listCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>
                  {AppFormatters.cleanDescription(a.title)}
                </Text>
                <Text style={styles.listSub}>
                  {a.sensor?.device?.zone?.name ?? ''} ·{' '}
                  {AppFormatters.shortDateTime(a.openedAt)}
                </Text>
              </View>
              <StatusBadge
                text={AppFormatters.severityLabel(a.severitySnapshot)}
                color={AppFormatters.severityColor(a.severitySnapshot)}
              />
            </View>
          ))}
        </>
      )}

      {recentLogs.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 14, marginBottom: 8 }]}>
            Hoạt động gần đây
          </Text>
          <View style={styles.logBox}>
            {recentLogs.map((log, i) => (
              <View
                key={log.id}
                style={[
                  styles.logRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
                ]}
              >
                <Ionicons name="time-outline" size={17} color="#16A34A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.logDesc}>
                    {AppFormatters.cleanDescription(log.description)}
                  </Text>
                  <Text style={styles.logTime}>
                    {AppFormatters.dateTime(log.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32 },
  heroCard: {
    backgroundColor: '#15803D',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  zoneChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  zoneChipActive: {
    backgroundColor: '#FFFFFF',
  },
  zoneChipText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  zoneChipTextActive: {
    color: '#15803D',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  listSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  logBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  logDesc: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  logTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});

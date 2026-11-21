import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  InlineErrorCard,
  KeyboardSafeModal,
  SimpleLineChart,
  StatTile,
  StatusBadge,
} from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { smartAgriApi } from '../services/api';
import type {
  DeviceModel,
  SensorChartPointModel,
  SensorModel,
  SensorReadingModel,
  SensorStatisticsModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function SensorsScreen({
  initialSensorId,
  onConsumeInitialSensor,
}: {
  initialSensorId?: string | null;
  onConsumeInitialSensor?: () => void;
}) {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [sensors, setSensors] = useState<SensorModel[]>([]);
  const [devices, setDevices] = useState<DeviceModel[]>([]);

  // Detail modal state
  const [selectedSensor, setSelectedSensor] = useState<SensorModel | null>(null);
  const [rangeKey, setRangeKey] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [points, setPoints] = useState<SensorChartPointModel[]>([]);
  const [stats, setStats] = useState<SensorStatisticsModel | null>(null);
  const [readings, setReadings] = useState<SensorReadingModel[]>([]);

  // Create / Edit Sensor modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<SensorModel | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [sensorType, setSensorType] = useState<'TEMP' | 'AIR_HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT'>('TEMP');
  const [sensorCode, setSensorCode] = useState('');
  const [sensorName, setSensorName] = useState('');
  const [sensorDesc, setSensorDesc] = useState('');
  const [sensorStatus, setSensorStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const loadSensors = useCallback(
    async (silent = true) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await smartAgriApi.listSensors({
          type: typeFilter || undefined,
          limit: 100,
        });
        setSensors(res.items);
      } catch (e) {
        if (!silent) showError(e);
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [typeFilter, showError],
  );

  useEffect(() => {
    void loadSensors(false);
    const timer = setInterval(() => {
      void loadSensors(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [loadSensors]);

  const openCreateSensor = async () => {
    try {
      const devRes = await smartAgriApi.listDevices({ status: 'ACTIVE', limit: 100 });
      setDevices(devRes.items);
      setEditingSensor(null);
      setDeviceId(devRes.items[0]?.id ?? '');
      setSensorType('TEMP');
      setSensorCode(`TEMP_${Math.floor(10 + Math.random() * 89)}`);
      setSensorName('Cảm biến nhiệt độ mới');
      setSensorDesc('');
      setSensorStatus('ACTIVE');
      setFormOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEditSensor = (s: SensorModel) => {
    setEditingSensor(s);
    setDeviceId(s.deviceId);
    setSensorType((s.type as 'TEMP' | 'AIR_HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT') || 'TEMP');
    setSensorCode(s.sensorCode);
    setSensorName(s.name);
    setSensorDesc(s.description ?? '');
    setSensorStatus((s.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormOpen(true);
  };

  const handleDeleteSensor = (s: SensorModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteSensor(s.id);
        setFormOpen(false);
        setEditingSensor(null);
        showSuccess(`Đã xóa cảm biến "${s.name}"`);
        await loadSensors(false);
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa cảm biến "${s.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa cảm biến?',
      `Bạn có chắc chắn muốn xóa "${s.name}"?\nToàn bộ dữ liệu đo và quy tắc gắn với cảm biến này cũng sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa cảm biến', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSaveSensor = async () => {
    Keyboard.dismiss();
    if (sensorName.trim().length < 2) {
      showError('Tên cảm biến cần ít nhất 2 ký tự.');
      return;
    }
    try {
      if (editingSensor) {
        await smartAgriApi.updateSensor(editingSensor.id, {
          name: sensorName.trim(),
          description: sensorDesc.trim() || null,
          status: sensorStatus,
        });
        showSuccess('Đã cập nhật cảm biến');
      } else {
        if (!deviceId) {
          showError('Vui lòng chọn thiết bị điều khiển.');
          return;
        }
        await smartAgriApi.createSensor({
          deviceId,
          sensorCode: sensorCode.trim().toUpperCase(),
          name: sensorName.trim(),
          type: sensorType,
          description: sensorDesc.trim() || null,
        });
        showSuccess('Đã thêm cảm biến mới');
      }
      setFormOpen(false);
      await loadSensors(false);
    } catch (e) {
      showError(e);
    }
  };

  const loadHistory = useCallback(
    async (
      sensor: SensorModel,
      rKey: '1h' | '24h' | '7d' | '30d',
      silent = false,
    ) => {
      if (!silent) {
        setHistoryLoading(true);
        setHistoryError(null);
      }
      try {
        const to = new Date();
        const from = new Date(to);
        let resolution = '15m';
        if (rKey === '1h') {
          from.setHours(from.getHours() - 1);
          resolution = '5m';
        } else if (rKey === '7d') {
          from.setDate(from.getDate() - 7);
          resolution = '1h';
        } else if (rKey === '30d') {
          from.setDate(from.getDate() - 30);
          resolution = '6h';
        } else {
          from.setHours(from.getHours() - 24);
          resolution = '15m';
        }
        const fromIso = from.toISOString();
        const toIso = to.toISOString();
        const [chartPts, st, rd] = await Promise.all([
          smartAgriApi.sensorChart(sensor.id, {
            from: fromIso,
            to: toIso,
            resolution,
          }),
          smartAgriApi.sensorStatistics(sensor.id, { from: fromIso, to: toIso }),
          smartAgriApi.sensorReadings(sensor.id, {
            from: fromIso,
            to: toIso,
            limit: 20,
          }),
        ]);

        const recentItems = rd.items ?? [];
        let displayPoints = chartPts ?? [];
        if (displayPoints.length <= 1 && recentItems.length > 1) {
          displayPoints = recentItems
            .slice()
            .reverse()
            .map((item) => ({
              timestamp: item.recordedAt,
              value: Number(item.value),
              min: Number(item.value),
              max: Number(item.value),
              count: 1,
            }));
        }

        setPoints(displayPoints);
        setStats(st);
        setReadings(recentItems);
        setHistoryError(null);
      } catch (e) {
        if (!silent) {
          setHistoryError(e);
          showError(e);
        }
      } finally {
        if (!silent) setHistoryLoading(false);
      }
    },
    [showError],
  );

  const openSensorDetail = useCallback(
    (s: SensorModel) => {
      setSelectedSensor(s);
      setRangeKey('24h');
      void loadHistory(s, '24h', false);
    },
    [loadHistory],
  );

  useEffect(() => {
    if (!initialSensorId || sensors.length === 0) return;
    const target = sensors.find((s) => s.id === initialSensorId);
    if (target) {
      openSensorDetail(target);
      onConsumeInitialSensor?.();
    }
  }, [initialSensorId, sensors, openSensorDetail, onConsumeInitialSensor]);

  useEffect(() => {
    if (!selectedSensor) return;
    const timer = setInterval(() => {
      void loadHistory(selectedSensor, rangeKey, true);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedSensor, rangeKey, loadHistory]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSensors(false)}
          />
        }
      >
        <View style={styles.topRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {(
              [
                ['', 'Tất cả'],
                ['TEMP', 'Nhiệt độ'],
                ['AIR_HUMIDITY', 'Độ ẩm KK'],
                ['SOIL_MOISTURE', 'Độ ẩm đất'],
                ['LIGHT', 'Ánh sáng'],
              ] as const
            ).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                onPress={() => setTypeFilter(val)}
                style={[
                  styles.filterChip,
                  typeFilter === val && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    typeFilter === val && styles.filterChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {canManage && (
            <TouchableOpacity
              onPress={() => void openCreateSensor()}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Thêm</Text>
            </TouchableOpacity>
          )}
        </View>

        {sensors.map((s) => {
          const color = AppFormatters.sensorColor(s.type);
          const unit = AppFormatters.sensorUnit(s.type, s.unit);
          const val = s.latestReading?.value;
          return (
            <TouchableOpacity
              key={s.id}
              activeOpacity={0.85}
              onPress={() => openSensorDetail(s)}
              style={styles.sensorRowCard}
            >
              <View style={[styles.iconBox, { backgroundColor: `${color}1A` }]}>
                <Ionicons name="analytics-outline" size={22} color={color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.typeTag, { color }]}>
                    {AppFormatters.sensorTypeLabel(s.type)}
                  </Text>
                  <StatusBadge
                    text={AppFormatters.activeStatusLabel(s.status)}
                    color={s.status === 'ACTIVE' ? '#16A34A' : '#64748B'}
                  />
                </View>
                <Text style={styles.sensorTitle}>{s.name}</Text>
                <Text style={styles.sensorSub}>
                  {s.device?.zone?.name ?? ''} · {s.device?.name ?? ''}
                </Text>
                {s.latestReading && (
                  <Text style={styles.sensorTime}>
                    Cập nhật:{' '}
                    {AppFormatters.shortDateTime(s.latestReading.recordedAt)}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.readingText}>
                  {val !== undefined ? `${AppFormatters.number(val, 1)} ${unit}` : '—'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  {canManage && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => openEditSensor(s)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="create-outline" size={18} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSensor(s)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={17} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text style={{ fontSize: 11.5, color: '#16A34A', fontWeight: '700' }}>
                    Biểu đồ →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <KeyboardSafeModal
        visible={formOpen}
        title={editingSensor ? 'Cập nhật cảm biến' : 'Thêm cảm biến mới'}
        onClose={() => setFormOpen(false)}
      >
        {!editingSensor && (
          <>
            <Text style={styles.label}>Thiết bị điều khiển</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {devices.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setDeviceId(d.id)}
                  style={[
                    styles.filterChip,
                    deviceId === d.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      deviceId === d.id && styles.filterChipTextActive,
                    ]}
                  >
                    {d.name} ({d.zone?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Loại cảm biến</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {(
                [
                  ['TEMP', 'Nhiệt độ', 'TEMP'],
                  ['AIR_HUMIDITY', 'Độ ẩm KK', 'HUM'],
                  ['SOIL_MOISTURE', 'Độ ẩm đất', 'SOIL'],
                  ['LIGHT', 'Ánh sáng', 'LIGHT'],
                ] as const
              ).map(([t, label, prefix]) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setSensorType(t);
                    setSensorCode(`${prefix}_${Math.floor(10 + Math.random() * 89)}`);
                    setSensorName(`Cảm biến ${label.toLowerCase()}`);
                  }}
                  style={[
                    styles.filterChip,
                    { marginRight: 0 },
                    sensorType === t && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sensorType === t && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mã định danh cảm biến</Text>
            <TextInput
              style={styles.input}
              value={sensorCode}
              onChangeText={setSensorCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </>
        )}

        <Text style={styles.label}>Tên hiển thị cảm biến</Text>
        <TextInput
          style={styles.input}
          value={sensorName}
          onChangeText={setSensorName}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Mô tả vị trí lắp đặt (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={sensorDesc}
          onChangeText={setSensorDesc}
          placeholder="Ví dụ: Giữa luống nhà màng A"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {editingSensor && (
          <>
            <Text style={styles.label}>Trạng thái hoạt động</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Tạm ngưng'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setSensorStatus(st)}
                  style={[
                    styles.filterChip,
                    { flex: 1, alignItems: 'center', marginRight: 0 },
                    sensorStatus === st && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sensorStatus === st && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={styles.cancelBtn}
          >
            <Text style={{ fontWeight: '700', color: '#475569' }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveSensor} style={styles.saveBtn}>
            <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
              {editingSensor ? 'Lưu thay đổi' : 'Tạo cảm biến'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingSensor && (
          <TouchableOpacity
            onPress={() => handleDeleteSensor(editingSensor)}
            style={[
              styles.cancelBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ fontWeight: '800', color: '#DC2626' }}>
              Xóa cảm biến này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>

      <Modal visible={Boolean(selectedSensor)} animationType="slide">
        {selectedSensor && (
          <View style={styles.modalScreen}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedSensor(null)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedSensor.name}
              </Text>
              <TouchableOpacity
                onPress={() => void loadHistory(selectedSensor, rangeKey, false)}
                disabled={historyLoading}
                style={styles.refreshBtn}
                accessibilityLabel="Làm mới biểu đồ"
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={historyLoading ? '#94A3B8' : '#15803D'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
              refreshControl={
                <RefreshControl
                  refreshing={historyLoading}
                  onRefresh={() => void loadHistory(selectedSensor, rangeKey, false)}
                />
              }
            >
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {(
                  [
                    ['1h', '1 giờ'],
                    ['24h', '24 giờ'],
                    ['7d', '7 ngày'],
                    ['30d', '30 ngày'],
                  ] as const
                ).map(([rk, label]) => (
                  <TouchableOpacity
                    key={rk}
                    onPress={() => {
                      setRangeKey(rk);
                      void loadHistory(selectedSensor, rk);
                    }}
                    style={[
                      styles.filterChip,
                      rangeKey === rk && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        rangeKey === rk && styles.filterChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {historyError ? (
                <InlineErrorCard
                  error={historyError}
                  onRetry={() => void loadHistory(selectedSensor, rangeKey)}
                />
              ) : null}

              {historyLoading ? (
                <ActivityIndicator
                  size="large"
                  color="#16A34A"
                  style={{ marginVertical: 40 }}
                />
              ) : (
                <>
                  {stats && (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <StatTile
                        label="Trung bình"
                        value={`${AppFormatters.number(stats.average, 1)} ${stats.unit}`}
                        subtitle={`${stats.count} phép đo`}
                        icon="pulse-outline"
                        color={AppFormatters.sensorColor(selectedSensor.type)}
                      />
                      <StatTile
                        label="Thấp nhất / Cao nhất"
                        value={`${AppFormatters.number(stats.minimum, 1)} – ${AppFormatters.number(stats.maximum, 1)}`}
                        subtitle={`Đơn vị: ${stats.unit}`}
                        icon="swap-vertical-outline"
                        color="#475569"
                      />
                    </View>
                  )}

                  <View style={styles.chartCard}>
                    <Text style={styles.chartCardTitle}>
                      Biểu đồ biến thiên ({AppFormatters.sensorUnit(selectedSensor.type, selectedSensor.unit)})
                    </Text>
                    <SimpleLineChart
                      points={points}
                      color={AppFormatters.sensorColor(selectedSensor.type)}
                      unit={AppFormatters.sensorUnit(
                        selectedSensor.type,
                        selectedSensor.unit,
                      )}
                    />
                  </View>

                  <Text style={[styles.chartCardTitle, { marginTop: 16, marginBottom: 8 }]}>
                    Các bản ghi đo gần nhất
                  </Text>
                  <View style={styles.readingsBox}>
                    {readings.length === 0 ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#64748B', fontSize: 13 }}>
                          Chưa có bản ghi đo trong khoảng thời gian này.
                        </Text>
                      </View>
                    ) : (
                      readings.map((r, idx) => (
                        <View
                          key={r.id}
                          style={[
                            styles.readingRow,
                            idx > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
                          ]}
                        >
                          <View>
                            <Text style={{ fontWeight: '800', fontSize: 14, color: '#0F172A' }}>
                              {AppFormatters.number(r.value, 2)}{' '}
                              {AppFormatters.sensorUnit(
                                selectedSensor.type,
                                selectedSensor.unit,
                              )}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                              {AppFormatters.dateTime(r.recordedAt)}
                            </Text>
                          </View>
                          <StatusBadge
                            text={r.source === 'MQTT' ? 'Thiết bị thực' : 'Mô phỏng'}
                            color={r.source === 'MQTT' ? '#16A34A' : '#64748B'}
                          />
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 32 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#15803D',
  },
  sensorRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 11,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTag: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  sensorTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  sensorSub: {
    fontSize: 12,
    color: '#64748B',
  },
  sensorTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  readingText: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modalHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  chartCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  readingsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});

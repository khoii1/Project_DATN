import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KeyboardSafeModal,
  PumpControlCard,
  StatusBadge,
} from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { smartAgriApi } from '../services/api';
import type {
  ActuatorModel,
  AutomationRuleModel,
  DeviceCommandModel,
  DeviceModel,
  SensorModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function IrrigationScreen() {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [subTab, setSubTab] = useState<'pumps' | 'rules' | 'history'>('pumps');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'' | 'MANUAL' | 'AUTOMATION'>('');

  const [actuators, setActuators] = useState<ActuatorModel[]>([]);
  const [rules, setRules] = useState<AutomationRuleModel[]>([]);
  const [commands, setCommands] = useState<DeviceCommandModel[]>([]);
  const [devices, setDevices] = useState<DeviceModel[]>([]);
  const [soilSensors, setSoilSensors] = useState<SensorModel[]>([]);

  // Actuator create/edit modal state
  const [actModalOpen, setActModalOpen] = useState(false);
  const [editingActuator, setEditingActuator] = useState<ActuatorModel | null>(null);
  const [actDeviceId, setActDeviceId] = useState('');
  const [actCode, setActCode] = useState('');
  const [actName, setActName] = useState('');
  const [actType, setActType] = useState<'PUMP' | 'VALVE' | 'RELAY'>('PUMP');
  const [actChannel, setActChannel] = useState('GPIO26');
  const [actStatus, setActStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Rule create/edit modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRuleModel | null>(null);
  const [ruleSensorId, setRuleSensorId] = useState('');
  const [ruleActuatorId, setRuleActuatorId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [startThreshold, setStartThreshold] = useState('30');
  const [stopThreshold, setStopThreshold] = useState('45');

  const loadAll = useCallback(
    async (silent = true) => {
      if (!silent) setRefreshing(true);
      try {
        const [aPage, rPage, cPage] = await Promise.all([
          smartAgriApi.listActuators({ limit: 50 }),
          smartAgriApi.listAutomationRules({ limit: 100 }),
          smartAgriApi.listCommands({
            source: sourceFilter || undefined,
            limit: 30,
          }),
        ]);
        setActuators(aPage.items);
        setRules(rPage.items);
        setCommands(cPage.items);
      } catch (e) {
        if (!silent) showError(e);
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [sourceFilter, showError],
  );

  useEffect(() => {
    void loadAll(false);
    const timer = setInterval(() => {
      void loadAll(true);
    }, 2000);
    return () => clearInterval(timer);
  }, [loadAll]);

  const ruleForActuator = (actuatorId: string) =>
    rules.find((r) => r.actuatorId === actuatorId && r.enabled) ||
    rules.find((r) => r.actuatorId === actuatorId) ||
    null;

  const sendPumpCommand = (
    actuator: ActuatorModel,
    command: 'TURN_ON' | 'TURN_OFF',
  ) => {
    const label = command === 'TURN_ON' ? 'Bật máy bơm' : 'Tắt máy bơm';
    const run = async () => {
      setBusy(true);
      try {
        await smartAgriApi.issueCommand(actuator.id, command);
        showSuccess(`Đã gửi yêu cầu ${label.toLowerCase()} (${actuator.name})`);
        await loadAll(true);
      } catch (e) {
        showError(e);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'web') {
      void run();
      return;
    }

    Alert.alert(
      `${label}?`,
      command === 'TURN_ON'
        ? `${actuator.name} sẽ bắt đầu tưới cho đến khi bạn nhấn Tắt.`
        : `Dừng ${actuator.name} ngay bây giờ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: label, onPress: () => void run() },
      ],
    );
  };

  const openCreateActuator = async () => {
    try {
      const devRes = await smartAgriApi.listDevices({ status: 'ACTIVE', limit: 100 });
      setDevices(devRes.items);
      setEditingActuator(null);
      setActDeviceId(devRes.items[0]?.id ?? '');
      setActType('PUMP');
      setActCode(`PUMP_${Math.floor(10 + Math.random() * 89)}`);
      setActName('Máy bơm tưới mới');
      setActChannel('GPIO26');
      setActStatus('ACTIVE');
      setActModalOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEditActuator = (a: ActuatorModel) => {
    setEditingActuator(a);
    setActDeviceId(a.deviceId);
    setActType((a.type as 'PUMP' | 'VALVE' | 'RELAY') || 'PUMP');
    setActCode(a.actuatorCode);
    setActName(a.name);
    setActChannel(a.hardwareChannel ?? '');
    setActStatus((a.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setActModalOpen(true);
  };

  const handleDeleteActuator = (a: ActuatorModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteActuator(a.id);
        setActModalOpen(false);
        setEditingActuator(null);
        showSuccess(`Đã xóa thiết bị tưới "${a.name}"`);
        await loadAll(false);
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa thiết bị tưới "${a.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa thiết bị tưới?',
      `Bạn có chắc chắn muốn xóa "${a.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleDeleteRule = (r: AutomationRuleModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteAutomationRule(r.id);
        setRuleModalOpen(false);
        setEditingRule(null);
        showSuccess(`Đã xóa quy tắc "${r.name}"`);
        await loadAll(false);
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa quy tắc tưới tự động "${r.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa quy tắc tưới tự động?',
      `Bạn có chắc chắn muốn xóa "${r.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa quy tắc', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const saveActuator = async () => {
    Keyboard.dismiss();
    if (actName.trim().length < 2) {
      showError('Tên thiết bị tưới cần ít nhất 2 ký tự.');
      return;
    }
    try {
      if (editingActuator) {
        await smartAgriApi.updateActuator(editingActuator.id, {
          name: actName.trim(),
          hardwareChannel: actChannel.trim() || null,
          status: actStatus,
        });
        showSuccess('Đã cập nhật thiết bị tưới');
      } else {
        if (!actDeviceId) {
          showError('Vui lòng chọn thiết bị điều khiển.');
          return;
        }
        await smartAgriApi.createActuator({
          deviceId: actDeviceId,
          actuatorCode: actCode.trim().toUpperCase(),
          name: actName.trim(),
          type: actType,
          hardwareChannel: actChannel.trim() || null,
        });
        showSuccess('Đã thêm thiết bị tưới mới');
      }
      setActModalOpen(false);
      await loadAll(false);
    } catch (e) {
      showError(e);
    }
  };

  const toggleRule = async (rule: AutomationRuleModel) => {
    try {
      await smartAgriApi.updateAutomationRule(rule.id, { enabled: !rule.enabled });
      showSuccess(
        rule.enabled ? 'Đã tắt chế độ tưới tự động' : 'Đã bật chế độ tưới tự động',
      );
      await loadAll(true);
    } catch (e) {
      showError(e);
    }
  };

  const resumeAuto = async (rule: AutomationRuleModel) => {
    try {
      await smartAgriApi.updateAutomationRule(rule.id, { enabled: true });
      showSuccess('Đã chuyển về chế độ tưới tự động');
      await loadAll(true);
    } catch (e) {
      showError(e);
    }
  };

  const openCreateRule = async () => {
    try {
      const sRes = await smartAgriApi.listSensors({ type: 'SOIL_MOISTURE', limit: 100 });
      setSoilSensors(sRes.items);
      setEditingRule(null);
      setRuleSensorId(sRes.items[0]?.id ?? '');
      setRuleActuatorId(actuators[0]?.id ?? '');
      setRuleName('Tưới tự động theo độ ẩm đất');
      setStartThreshold('30');
      setStopThreshold('45');
      setRuleModalOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEditRule = (r: AutomationRuleModel) => {
    setEditingRule(r);
    setRuleSensorId(r.sensorId);
    setRuleActuatorId(r.actuatorId);
    setRuleName(r.name);
    setStartThreshold(String(r.startThreshold));
    setStopThreshold(String(r.stopThreshold));
    setRuleModalOpen(true);
  };

  const saveRuleEdit = async () => {
    Keyboard.dismiss();
    const parsedStart = Number(startThreshold.trim().replace(',', '.'));
    const parsedStop = Number(stopThreshold.trim().replace(',', '.'));
    if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedStop)) {
      showError('Vui lòng nhập ngưỡng độ ẩm hợp lệ.');
      return;
    }
    if (parsedStart >= parsedStop) {
      showError('Ngưỡng tắt tưới phải lớn hơn ngưỡng bật tưới.');
      return;
    }
    try {
      if (editingRule) {
        await smartAgriApi.updateAutomationRule(editingRule.id, {
          name: ruleName.trim(),
          startThreshold: parsedStart,
          stopThreshold: parsedStop,
        });
        showSuccess('Đã cập nhật ngưỡng tưới tự động');
      } else {
        if (!ruleSensorId || !ruleActuatorId) {
          showError('Vui lòng chọn cảm biến độ ẩm đất và máy bơm tưới.');
          return;
        }
        await smartAgriApi.createAutomationRule({
          name: ruleName.trim(),
          sensorId: ruleSensorId,
          actuatorId: ruleActuatorId,
          startThreshold: parsedStart,
          stopThreshold: parsedStop,
          enabled: true,
        });
        showSuccess('Đã tạo quy tắc tưới tự động mới');
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      await loadAll(false);
    } catch (e) {
      showError(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {(
          [
            ['pumps', 'Máy bơm'],
            ['rules', 'Quy tắc tự động'],
            ['history', 'Lịch sử lệnh'],
          ] as const
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSubTab(key)}
            style={[styles.tabItem, subTab === key && styles.tabItemActive]}
          >
            <Text
              style={[
                styles.tabItemText,
                subTab === key && styles.tabItemTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadAll(false)} />
        }
      >
        {subTab === 'pumps' && (
          <>
            {canManage && (
              <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => void openCreateActuator()}
                  style={styles.addBtn}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Thêm máy bơm / van tưới</Text>
                </TouchableOpacity>
              </View>
            )}
            {actuators.map((actuator) => {
              const rule = ruleForActuator(actuator.id);
              return (
                <PumpControlCard
                  key={actuator.id}
                  actuator={actuator}
                  rule={rule}
                  busy={busy}
                  onCommand={(cmd) => sendPumpCommand(actuator, cmd)}
                  onToggleAuto={rule ? () => void toggleRule(rule) : undefined}
                  onResumeAuto={rule ? () => void resumeAuto(rule) : undefined}
                  onEdit={canManage ? () => openEditActuator(actuator) : undefined}
                />
              );
            })}
          </>
        )}

        {subTab === 'rules' && (
          <>
            {canManage && (
              <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => void openCreateRule()}
                  style={styles.addBtn}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Tạo quy tắc tưới tự động</Text>
                </TouchableOpacity>
              </View>
            )}
            {rules.map((r) => (
              <View key={r.id} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleName}>{r.name}</Text>
                  <Switch
                    value={r.enabled}
                    disabled={!canManage}
                    onValueChange={() => void toggleRule(r)}
                  />
                </View>
                <Text style={styles.ruleSub}>
                  {r.sensor?.device?.zone?.name ?? ''} · {r.sensor?.name ?? 'Cảm biến độ ẩm đất'} →{' '}
                  {r.actuator?.name ?? 'Máy bơm tưới'}
                </Text>
                <View style={styles.badgeWrap}>
                  <StatusBadge
                    text={`Bật khi < ${AppFormatters.number(r.startThreshold, 0)}%`}
                    color="#16A34A"
                  />
                  <StatusBadge
                    text={`Tắt khi ≥ ${AppFormatters.number(r.stopThreshold, 0)}%`}
                    color="#2563EB"
                  />
                  {r.sensor?.latestReading?.value !== undefined && (
                    <StatusBadge
                      text={`Hiện tại: ${AppFormatters.number(r.sensor.latestReading.value, 1)}%`}
                      color="#475569"
                    />
                  )}
                </View>
                {r.manualOverrideActive && (
                  <View style={styles.overrideRow}>
                    <Text style={styles.overrideText}>
                      Ưu tiên thủ công đến{' '}
                      {AppFormatters.shortDateTime(r.manualOverrideUntil)}
                    </Text>
                    <TouchableOpacity onPress={() => void resumeAuto(r)}>
                      <Text style={styles.overrideLink}>Tiếp tục tự động ngay</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {canManage && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      gap: 16,
                      marginTop: 10,
                    }}
                  >
                    <TouchableOpacity onPress={() => openEditRule(r)}>
                      <Text style={styles.editRuleText}>Chỉnh sửa ngưỡng %</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRule(r)}>
                      <Text style={[styles.editRuleText, { color: '#DC2626' }]}>
                        Xóa quy tắc
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {subTab === 'history' && (
          <>
            <View style={styles.filterRow}>
              {(
                [
                  ['', 'Tất cả'],
                  ['MANUAL', 'Thủ công'],
                  ['AUTOMATION', 'Tự động'],
                ] as const
              ).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSourceFilter(val)}
                  style={[
                    styles.filterChip,
                    sourceFilter === val && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      sourceFilter === val && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {commands.map((c) => {
              const isSuccess = c.status === 'SUCCESS';
              const isPending = c.status === 'PENDING';
              const pumpTitle = c.actuator?.name || 'Máy bơm tưới';
              const zoneName = c.actuator?.device?.zone?.name || '';
              return (
                <View key={c.id} style={styles.cmdCard}>
                  <View style={styles.cmdTop}>
                    <Text style={styles.cmdTitle}>
                      {pumpTitle} ·{' '}
                      {c.command === 'TURN_ON' ? 'Bật máy bơm' : 'Tắt máy bơm'}
                    </Text>
                    <StatusBadge
                      text={
                        isSuccess
                          ? 'Thành công'
                          : isPending
                            ? 'Đang gửi'
                            : 'Chưa thực hiện'
                      }
                      color={
                        isSuccess
                          ? '#16A34A'
                          : isPending
                            ? '#D97706'
                            : '#DC2626'
                      }
                    />
                  </View>
                  <Text style={styles.cmdSub}>
                    {c.source === 'MANUAL'
                      ? `Thủ công (${c.requestedBy?.fullName ?? 'Người dùng'})`
                      : `Tự động (${c.automationRule?.name ?? 'Quy tắc'})`}
                    {zoneName ? ` · ${zoneName}` : ''}
                  </Text>
                  <Text style={styles.cmdTime}>
                    {AppFormatters.dateTime(c.requestedAt)}
                  </Text>
                  {c.status === 'FAILED' && c.failureReason && (
                    <Text style={styles.cmdFail}>
                      {AppFormatters.commandFailureLabel(c.failureReason)}
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <KeyboardSafeModal
        visible={actModalOpen}
        title={editingActuator ? 'Cập nhật thiết bị tưới' : 'Thêm thiết bị tưới mới'}
        onClose={() => setActModalOpen(false)}
      >
        {!editingActuator && (
          <>
            <Text style={styles.label}>Thiết bị điều khiển</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {devices.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setActDeviceId(d.id)}
                  style={[
                    styles.filterChip,
                    { marginRight: 8 },
                    actDeviceId === d.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      actDeviceId === d.id && styles.filterChipTextActive,
                    ]}
                  >
                    {d.name} ({d.zone?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Phân loại</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(
                [
                  ['PUMP', 'Máy bơm nước'],
                  ['VALVE', 'Van điện từ'],
                  ['RELAY', 'Rơ-le điều khiển'],
                ] as const
              ).map(([t, label]) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setActType(t);
                    setActCode(`${t}_${Math.floor(10 + Math.random() * 89)}`);
                    setActName(label);
                  }}
                  style={[
                    styles.filterChip,
                    { flex: 1, alignItems: 'center' },
                    actType === t && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      actType === t && styles.filterChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Mã định danh</Text>
            <TextInput
              style={styles.input}
              value={actCode}
              onChangeText={setActCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </>
        )}

        <Text style={styles.label}>Tên thiết bị tưới</Text>
        <TextInput
          style={styles.input}
          value={actName}
          onChangeText={setActName}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Chân điều khiển phần cứng (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={actChannel}
          onChangeText={setActChannel}
          placeholder="Ví dụ: GPIO26 / Relay 1"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {editingActuator && (
          <>
            <Text style={styles.label}>Trạng thái vận hành</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Tạm ngưng'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setActStatus(st)}
                  style={[
                    styles.filterChip,
                    { flex: 1, alignItems: 'center' },
                    actStatus === st && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      actStatus === st && styles.filterChipTextActive,
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
              setActModalOpen(false);
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveActuator} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              {editingActuator ? 'Lưu thay đổi' : 'Tạo thiết bị'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingActuator && (
          <TouchableOpacity
            onPress={() => handleDeleteActuator(editingActuator)}
            style={[
              styles.cancelBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ fontWeight: '800', color: '#DC2626' }}>
              Xóa thiết bị tưới này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>

      <KeyboardSafeModal
        visible={ruleModalOpen}
        title={
          editingRule
            ? 'Chỉnh sửa ngưỡng tưới tự động'
            : 'Tạo quy tắc tưới tự động mới'
        }
        subtitle={
          editingRule
            ? `${editingRule.sensor?.device?.zone?.name ?? ''} · ${editingRule.actuator?.name ?? 'Máy bơm tưới'}`
            : undefined
        }
        onClose={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
      >
        {!editingRule && (
          <>
            <Text style={styles.label}>Cảm biến độ ẩm đất theo dõi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {soilSensors.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setRuleSensorId(s.id)}
                  style={[
                    styles.filterChip,
                    { marginRight: 8 },
                    ruleSensorId === s.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      ruleSensorId === s.id && styles.filterChipTextActive,
                    ]}
                  >
                    {s.name} ({s.device?.zone?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Máy bơm điều khiển</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {actuators.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setRuleActuatorId(a.id)}
                  style={[
                    styles.filterChip,
                    { marginRight: 8 },
                    ruleActuatorId === a.id && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      ruleActuatorId === a.id && styles.filterChipTextActive,
                    ]}
                  >
                    {a.name} ({a.device?.zone?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Tên quy tắc</Text>
        <TextInput
          style={styles.input}
          value={ruleName}
          onChangeText={setRuleName}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Dưới ngưỡng Bật (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={startThreshold}
              onChangeText={setStartThreshold}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Từ ngưỡng Tắt (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={stopThreshold}
              onChangeText={setStopThreshold}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        </View>
        <View style={styles.modalActions}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setRuleModalOpen(false);
              setEditingRule(null);
            }}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={saveRuleEdit} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              {editingRule ? 'Lưu ngưỡng mới' : 'Tạo quy tắc'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingRule && (
          <TouchableOpacity
            onPress={() => handleDeleteRule(editingRule)}
            style={[
              styles.cancelBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ fontWeight: '800', color: '#DC2626' }}>
              Xóa quy tắc này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#16A34A',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  content: { padding: 16, paddingBottom: 32 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  ruleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  ruleSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  overrideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  overrideText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  overrideLink: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  editRuleBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  editRuleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803D',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
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
  cmdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cmdTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cmdTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  cmdSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  cmdTime: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  cmdFail: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
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
    marginBottom: 8,
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
  cancelBtnText: {
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

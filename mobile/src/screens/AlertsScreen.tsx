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
import { KeyboardSafeModal, StatusBadge } from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { smartAgriApi } from '../services/api';
import type {
  AlertModel,
  AlertRuleModel,
  AlertSummaryModel,
  SensorModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function AlertsScreen() {
  const { user, refreshAlertBadge, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [subTab, setSubTab] = useState<'alerts' | 'rules'>('alerts');
  const [onlyActive, setOnlyActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<AlertSummaryModel>({
    active: 0,
    open: 0,
    acknowledged: 0,
    critical: 0,
    warning: 0,
    resolvedToday: 0,
  });
  const [alerts, setAlerts] = useState<AlertModel[]>([]);
  const [rules, setRules] = useState<AlertRuleModel[]>([]);
  const [sensors, setSensors] = useState<SensorModel[]>([]);

  // Create / Edit rule modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleModel | null>(null);
  const [sensorId, setSensorId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [operator, setOperator] = useState<'GT' | 'LT' | 'GTE' | 'LTE'>('GT');
  const [severity, setSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [threshold, setThreshold] = useState('');
  const [recovery, setRecovery] = useState('');

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const [sum, alPage, rlPage] = await Promise.all([
          smartAgriApi.alertSummary(),
          smartAgriApi.listAlerts({
            active: onlyActive ? true : undefined,
            limit: 50,
          }),
          smartAgriApi.listAlertRules({ limit: 100 }),
        ]);
        setSummary(sum);
        setAlerts(alPage.items);
        setRules(rlPage.items);
        void refreshAlertBadge();
      } catch (e) {
        if (!silent) showError(e);
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [onlyActive, refreshAlertBadge, showError],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleAcknowledge = async (a: AlertModel) => {
    try {
      await smartAgriApi.acknowledgeAlert(a.id);
      showSuccess('Đã xác nhận cảnh báo');
      await loadData(true);
    } catch (e) {
      showError(e);
    }
  };

  const handleResolve = async (a: AlertModel) => {
    try {
      await smartAgriApi.resolveAlert(a.id);
      showSuccess('Đã đóng cảnh báo hoàn tất');
      await loadData(true);
    } catch (e) {
      showError(e);
    }
  };

  const handleToggleRule = async (r: AlertRuleModel) => {
    try {
      await smartAgriApi.updateAlertRule(r.id, { enabled: !r.enabled });
      showSuccess(
        r.enabled ? 'Đã tắt quy tắc cảnh báo' : 'Đã bật quy tắc cảnh báo',
      );
      await loadData(true);
    } catch (e) {
      showError(e);
    }
  };

  const openCreateRule = async () => {
    try {
      const sRes = await smartAgriApi.listSensors({ limit: 100 });
      setSensors(sRes.items);
      setEditingRule(null);
      setSensorId(sRes.items[0]?.id ?? '');
      setRuleName('Cảnh báo vượt ngưỡng mới');
      setOperator('GT');
      setSeverity('WARNING');
      setThreshold('35');
      setRecovery('33');
      setRuleModalOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEditRule = (r: AlertRuleModel) => {
    setEditingRule(r);
    setSensorId(r.sensorId);
    setRuleName(r.name);
    setOperator((r.operator as 'GT' | 'LT' | 'GTE' | 'LTE') || 'GT');
    setSeverity((r.severity as 'INFO' | 'WARNING' | 'CRITICAL') || 'WARNING');
    setThreshold(String(r.threshold));
    setRecovery(r.recoveryThreshold !== null ? String(r.recoveryThreshold) : '');
    setRuleModalOpen(true);
  };

  const handleDeleteRule = (r: AlertRuleModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteAlertRule(r.id);
        setRuleModalOpen(false);
        setEditingRule(null);
        showSuccess(`Đã xóa quy tắc cảnh báo "${r.name}"`);
        await loadData(false);
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa quy tắc cảnh báo "${r.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa quy tắc cảnh báo?',
      `Bạn có chắc chắn muốn xóa "${r.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa quy tắc', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSaveRule = async () => {
    Keyboard.dismiss();
    if (ruleName.trim().length < 2) {
      showError('Tên quy tắc cần ít nhất 2 ký tự.');
      return;
    }
    const parsedThreshold = Number(threshold.trim().replace(',', '.'));
    const parsedRecovery = recovery.trim()
      ? Number(recovery.trim().replace(',', '.'))
      : null;
    if (!Number.isFinite(parsedThreshold)) {
      showError('Vui lòng nhập ngưỡng kích hoạt hợp lệ.');
      return;
    }
    if (parsedRecovery !== null && !Number.isFinite(parsedRecovery)) {
      showError('Vui lòng nhập ngưỡng phục hồi hợp lệ.');
      return;
    }
    try {
      if (editingRule) {
        await smartAgriApi.updateAlertRule(editingRule.id, {
          name: ruleName.trim(),
          operator,
          severity,
          threshold: parsedThreshold,
          recoveryThreshold: parsedRecovery,
        });
        showSuccess('Đã cập nhật quy tắc cảnh báo');
      } else {
        if (!sensorId) {
          showError('Vui lòng chọn cảm biến cần giám sát.');
          return;
        }
        await smartAgriApi.createAlertRule({
          sensorId,
          name: ruleName.trim(),
          operator,
          severity,
          threshold: parsedThreshold,
          recoveryThreshold: parsedRecovery,
          enabled: true,
        });
        showSuccess('Đã tạo quy tắc cảnh báo mới');
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      await loadData(false);
    } catch (e) {
      showError(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setSubTab('alerts')}
          style={[styles.tabItem, subTab === 'alerts' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              subTab === 'alerts' && styles.tabItemTextActive,
            ]}
          >
            Sự cố cảnh báo ({summary.active})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSubTab('rules')}
          style={[styles.tabItem, subTab === 'rules' && styles.tabItemActive]}
        >
          <Text
            style={[
              styles.tabItemText,
              subTab === 'rules' && styles.tabItemTextActive,
            ]}
          >
            Quy tắc cảnh báo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(false)}
          />
        }
      >
        {subTab === 'alerts' && (
          <>
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => setOnlyActive(true)}
                style={[styles.chip, onlyActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, onlyActive && styles.chipTextActive]}>
                  Đang hoạt động
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOnlyActive(false)}
                style={[styles.chip, !onlyActive && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, !onlyActive && styles.chipTextActive]}
                >
                  Tất cả lịch sử
                </Text>
              </TouchableOpacity>
            </View>

            {alerts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={40}
                  color="#16A34A"
                />
                <Text style={styles.emptyText}>
                  Hệ thống ổn định, không có cảnh báo đang mở.
                </Text>
              </View>
            ) : (
              alerts.map((a) => (
                <View key={a.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <StatusBadge
                      text={AppFormatters.severityLabel(a.severitySnapshot)}
                      color={AppFormatters.severityColor(a.severitySnapshot)}
                    />
                    <StatusBadge
                      text={AppFormatters.alertStatusLabel(a.status)}
                      color={a.status === 'RESOLVED' ? '#16A34A' : '#D97706'}
                    />
                  </View>
                  <Text style={styles.titleText}>
                    {AppFormatters.cleanDescription(a.title)}
                  </Text>
                  <Text style={styles.msgText}>
                    {AppFormatters.cleanDescription(a.message)}
                  </Text>
                  <Text style={styles.metaText}>
                    {a.sensor?.device?.zone?.name ?? ''} · {a.sensor?.name ?? 'Cảm biến'} ·{' '}
                    {AppFormatters.shortDateTime(a.openedAt)}
                  </Text>

                  {a.status !== 'RESOLVED' && (
                    <View style={styles.actionRow}>
                      {a.status === 'OPEN' && (
                        <TouchableOpacity
                          onPress={() => void handleAcknowledge(a)}
                          style={styles.ackBtn}
                        >
                          <Text style={styles.ackBtnText}>Xác nhận đã xem</Text>
                        </TouchableOpacity>
                      )}
                      {canManage && (
                        <TouchableOpacity
                          onPress={() => void handleResolve(a)}
                          style={styles.resolveBtn}
                        >
                          <Text style={styles.resolveBtnText}>Đóng cảnh báo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
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
                  <Text style={styles.addBtnText}>Tạo quy tắc cảnh báo</Text>
                </TouchableOpacity>
              </View>
            )}
            {rules.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={[styles.titleText, { flex: 1, marginTop: 0 }]}>
                    {r.name}
                  </Text>
                  <Switch
                    value={r.enabled}
                    disabled={!canManage}
                    onValueChange={() => void handleToggleRule(r)}
                  />
                </View>
                <Text style={styles.metaText}>
                  {r.sensor?.device?.zone?.name ?? ''} · {r.sensor?.name ?? 'Cảm biến'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <StatusBadge
                    text={`Kích hoạt: ${AppFormatters.operatorSymbol(r.operator)} ${AppFormatters.number(r.threshold, 1)} ${r.sensor?.unit ?? ''}`}
                    color={AppFormatters.severityColor(r.severity)}
                  />
                  {r.recoveryThreshold !== null && (
                    <StatusBadge
                      text={`Phục hồi: ${AppFormatters.number(r.recoveryThreshold, 1)} ${r.sensor?.unit ?? ''}`}
                      color="#16A34A"
                    />
                  )}
                </View>
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
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                        Chỉnh sửa ngưỡng
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRule(r)}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                        Xóa quy tắc
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <KeyboardSafeModal
        visible={ruleModalOpen}
        title={
          editingRule ? 'Cập nhật quy tắc cảnh báo' : 'Tạo quy tắc cảnh báo mới'
        }
        subtitle={
          editingRule
            ? `${editingRule.sensor?.device?.zone?.name ?? ''} · ${editingRule.sensor?.name ?? 'Cảm biến'}`
            : undefined
        }
        onClose={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
      >
        {!editingRule && (
          <>
            <Text style={styles.label}>Cảm biến giám sát</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {sensors.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSensorId(s.id)}
                  style={[
                    styles.chip,
                    { marginRight: 8 },
                    sensorId === s.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sensorId === s.id && styles.chipTextActive,
                    ]}
                  >
                    {s.name} ({s.device?.zone?.name ?? ''})
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

        <Text style={styles.label}>Điều kiện so sánh</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          {(
            [
              ['GT', 'Lớn hơn (>)'],
              ['LT', 'Nhỏ hơn (<)'],
              ['GTE', '≥'],
              ['LTE', '≤'],
            ] as const
          ).map(([op, label]) => (
            <TouchableOpacity
              key={op}
              onPress={() => setOperator(op)}
              style={[
                styles.chip,
                { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
                operator === op && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  operator === op && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mức độ cảnh báo</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          {(
            [
              ['INFO', 'Thông tin'],
              ['WARNING', 'Cảnh báo'],
              ['CRITICAL', 'Nghiêm trọng'],
            ] as const
          ).map(([sev, label]) => (
            <TouchableOpacity
              key={sev}
              onPress={() => setSeverity(sev)}
              style={[
                styles.chip,
                { flex: 1, alignItems: 'center' },
                severity === sev && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  severity === sev && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              Ngưỡng kích hoạt ({editingRule?.sensor?.unit ?? ''})
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={threshold}
              onChangeText={setThreshold}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>
              Ngưỡng phục hồi ({editingRule?.sensor?.unit ?? ''})
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={recovery}
              onChangeText={setRecovery}
              placeholder="Tùy chọn"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setRuleModalOpen(false);
              setEditingRule(null);
            }}
            style={styles.cancelBtn}
          >
            <Text style={{ fontWeight: '700', color: '#475569' }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveRule} style={styles.saveBtn}>
            <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>
              {editingRule ? 'Lưu thay đổi' : 'Tạo quy tắc'}
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
              Xóa quy tắc cảnh báo này
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
  tabItemActive: { borderBottomColor: '#16A34A' },
  tabItemText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabItemTextActive: { color: '#15803D', fontWeight: '800' },
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
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#15803D' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  msgText: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  ackBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ackBtnText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  resolveBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  resolveBtnText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
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

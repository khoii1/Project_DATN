import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { ActuatorModel, AutomationRuleModel, SensorChartPointModel } from '../types/models';
import { AppFormatters } from '../utils/formatters';

export function KeyboardSafeModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.kbModalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={styles.kbModalOverlayTap}
          onPress={() => {
            if (keyboardOpen) {
              Keyboard.dismiss();
            } else {
              onClose();
            }
          }}
        />
        <View style={styles.kbModalSheet}>
          <View style={styles.kbModalHandle} />
          <View style={styles.kbModalHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.kbModalTitle}>{title}</Text>
              {subtitle ? <Text style={styles.kbModalSub}>{subtitle}</Text> : null}
            </View>
            {keyboardOpen ? (
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                style={styles.kbHideBtn}
              >
                <Ionicons name="chevron-down" size={15} color="#15803D" />
                <Text style={styles.kbHideBtnText}>Xong</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} style={styles.kbCloseIconBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 18 : 12 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${color}1A`, borderColor: `${color}4D` },
      ]}
    >
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function InlineErrorCard({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
      <Text style={styles.errorText}>{AppFormatters.friendlyError(error)}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function StatTile({
  label,
  value,
  subtitle,
  icon,
  color = '#16A34A',
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle ? (
        <Text style={styles.statSub} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SensorReadingCard({
  name,
  type,
  unit,
  value,
  recordedAt,
  onPress,
}: {
  name: string;
  type: string;
  unit?: string;
  value: number | null;
  recordedAt?: string | null;
  onPress?: () => void;
}) {
  const color = AppFormatters.sensorColor(type);
  const displayUnit = AppFormatters.sensorUnit(type, unit);
  const iconName: keyof typeof Ionicons.glyphMap =
    type === 'TEMP'
      ? 'thermometer-outline'
      : type === 'AIR_HUMIDITY'
        ? 'water-outline'
        : type === 'SOIL_MOISTURE'
          ? 'leaf-outline'
          : 'sunny-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.sensorCard}
    >
      <View style={styles.sensorTop}>
        <View style={[styles.statIconWrap, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={iconName} size={17} color={color} />
        </View>
        <Text style={[styles.sensorTypeText, { color }]} numberOfLines={1}>
          {AppFormatters.sensorTypeLabel(type)}
        </Text>
      </View>
      <Text style={styles.sensorName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.sensorValueRow}>
        <Text style={[styles.sensorValue, value === null && { color: '#94A3B8' }]}>
          {value !== null ? AppFormatters.number(value, 1) : '—'}
        </Text>
        {value !== null && <Text style={styles.sensorUnit}>{displayUnit}</Text>}
      </View>
      <Text style={styles.sensorTime} numberOfLines={1}>
        {recordedAt
          ? `Cập nhật ${AppFormatters.shortDateTime(recordedAt)}`
          : 'Chưa có số liệu đo'}
      </Text>
    </TouchableOpacity>
  );
}

export function PumpControlCard({
  actuator,
  rule,
  busy = false,
  onCommand,
  onToggleAuto,
  onResumeAuto,
  onEdit,
}: {
  actuator: ActuatorModel;
  rule?: AutomationRuleModel | null;
  busy?: boolean;
  onCommand: (cmd: 'TURN_ON' | 'TURN_OFF') => void;
  onToggleAuto?: () => void;
  onResumeAuto?: () => void;
  onEdit?: () => void;
}) {
  const connStatus = actuator.device?.connectionStatus ?? 'UNKNOWN';
  const isOnline = connStatus === 'ONLINE';
  const isOn = isOnline && actuator.currentState === 'ON';
  const isOperational =
    actuator.canControl !== false &&
    actuator.controlEnabled !== false &&
    actuator.status === 'ACTIVE' &&
    (actuator.device?.status ?? 'ACTIVE') === 'ACTIVE';

  const isPendingOn =
    actuator.latestCommand?.status === 'PENDING' &&
    actuator.latestCommand?.command === 'TURN_ON';

  const canTurnOn =
    isOperational && isOnline && actuator.currentState === 'OFF' && !busy && !isPendingOn;
  const canTurnOff = isOperational && isOnline && !busy;

  const zoneName = actuator.device?.zone?.name ?? '';
  const deviceName = actuator.device?.name ?? '';
  const locationText = [zoneName, deviceName].filter(Boolean).join(' · ');

  return (
    <View style={[styles.pumpCard, isOn && styles.pumpCardOn]}>
      <View style={styles.pumpHeader}>
        <View
          style={[
            styles.powerCircle,
            { backgroundColor: isOn ? '#DCFCE7' : '#F1F5F9' },
          ]}
        >
          <Ionicons
            name="power"
            size={22}
            color={isOn ? '#16A34A' : '#64748B'}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.badgeRow}>
            <StatusBadge
              text={AppFormatters.actuatorTypeLabel(actuator.type)}
              color="#15803D"
            />
            <StatusBadge
              text={
                rule && rule.enabled
                  ? rule.manualOverrideActive
                    ? 'Ưu tiên thủ công'
                    : 'Tự động: Bật'
                  : 'Chế độ thủ công'
              }
              color={
                rule && rule.enabled
                  ? rule.manualOverrideActive
                    ? '#D97706'
                    : '#2563EB'
                  : '#64748B'
              }
            />
          </View>
          <Text style={styles.pumpTitle}>{actuator.name}</Text>
          {locationText ? (
            <Text style={styles.pumpSubtitle}>{locationText}</Text>
          ) : null}
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={{ padding: 6 }}>
            <Ionicons name="create-outline" size={20} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pumpStatusBar}>
        <Text
          style={{
            fontSize: 12.5,
            fontWeight: '700',
            color: isOnline ? '#15803D' : '#DC2626',
          }}
        >
          {isOnline ? 'Kết nối ổn định' : 'Thiết bị ngoại tuyến'}
        </Text>
        <Text
          style={{
            fontSize: 13.5,
            fontWeight: '800',
            color: !isOnline
              ? '#64748B'
              : isOn
                ? '#16A34A'
                : actuator.currentState === 'OFF'
                  ? '#334155'
                  : '#D97706',
          }}
        >
          {AppFormatters.actuatorStateLabel(actuator.currentState, connStatus)}
        </Text>
      </View>

      {rule && (
        <View
          style={[
            styles.autoBox,
            rule.enabled
              ? rule.manualOverrideActive
                ? styles.autoBoxAmber
                : styles.autoBoxBlue
              : styles.autoBoxGray,
          ]}
        >
          <View style={styles.autoRow}>
            <Text
              style={[
                styles.autoText,
                {
                  color: rule.enabled
                    ? rule.manualOverrideActive
                      ? '#B45309'
                      : '#1D4ED8'
                    : '#64748B',
                },
              ]}
            >
              {rule.enabled
                ? `Tự động: dưới ${AppFormatters.number(rule.startThreshold, 0)}% bật · từ ${AppFormatters.number(rule.stopThreshold, 0)}% tắt`
                : 'Chế độ tưới tự động đang tắt'}
            </Text>
            {onToggleAuto && (
              <TouchableOpacity onPress={onToggleAuto}>
                <Text style={styles.autoActionLink}>
                  {rule.enabled ? 'Tắt tự động' : 'Bật tự động'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {rule.enabled && rule.manualOverrideActive && (
            <View style={[styles.autoRow, { marginTop: 6 }]}>
              <Text style={{ fontSize: 11.5, color: '#B45309', flex: 1 }}>
                Ưu tiên thao tác tay đến{' '}
                {AppFormatters.shortDateTime(rule.manualOverrideUntil)}
              </Text>
              {onResumeAuto && (
                <TouchableOpacity onPress={onResumeAuto}>
                  <Text style={[styles.autoActionLink, { color: '#B45309' }]}>
                    Chuyển về tự động ngay
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {actuator.latestCommand?.status === 'PENDING' && (
        <Text style={styles.pendingNote}>
          Đang gửi yêu cầu điều khiển tới máy bơm...
        </Text>
      )}
      {actuator.latestCommand?.status === 'FAILED' && (
        <Text style={styles.failedNote}>
          {AppFormatters.commandFailureLabel(actuator.latestCommand?.failureReason)}
        </Text>
      )}

      <View style={styles.pumpActionsRow}>
        <TouchableOpacity
          disabled={!canTurnOn}
          onPress={() => onCommand('TURN_ON')}
          style={[
            styles.btnOn,
            !canTurnOn && { opacity: 0.45 },
          ]}
        >
          <Ionicons name="play" size={16} color="#FFFFFF" />
          <Text style={styles.btnOnText}>
            {busy ? 'Đang gửi...' : 'Bật máy bơm'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!canTurnOff}
          onPress={() => onCommand('TURN_OFF')}
          style={[
            styles.btnOff,
            !canTurnOff && { opacity: 0.45 },
          ]}
        >
          <Ionicons name="stop" size={16} color="#DC2626" />
          <Text style={styles.btnOffText}>Tắt máy bơm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SimpleLineChart({
  points,
  color,
  unit,
}: {
  points: SensorChartPointModel[];
  color: string;
  unit: string;
}) {
  const validPoints = (points ?? [])
    .map((p) => ({
      ...p,
      value: Number(p.value),
    }))
    .filter((p) => Number.isFinite(p.value));

  if (validPoints.length === 0) {
    return (
      <View style={{ height: 190, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#64748B', fontSize: 13 }}>
          Không có số liệu đo trong khoảng thời gian này.
        </Text>
      </View>
    );
  }

  const width = 320;
  const height = 195;
  const padL = 42;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  let minY = Math.min(...validPoints.map((p) => p.value));
  let maxY = Math.max(...validPoints.map((p) => p.value));
  if (minY === maxY) {
    minY -= 2;
    maxY += 2;
  } else {
    const pad = (maxY - minY) * 0.14;
    minY -= pad;
    maxY += pad;
  }

  const xFor = (i: number) =>
    validPoints.length === 1
      ? padL + plotW / 2
      : padL + (i / (validPoints.length - 1)) * plotW;
  const yFor = (val: number) =>
    padT + plotH - ((val - minY) / (maxY - minY || 1)) * plotH;

  const dPath = validPoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${xFor(idx).toFixed(1)} ${yFor(pt.value).toFixed(1)}`,
    )
    .join(' ');

  const areaPath =
    validPoints.length > 1
      ? `${dPath} L ${xFor(validPoints.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : '';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map((t, idx) => {
          const y = padT + t * plotH;
          const labelVal = maxY - t * (maxY - minY);
          return (
            <React.Fragment key={idx}>
              <Line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3,3"
                strokeWidth={1}
              />
              <SvgText
                x={padL - 6}
                y={y + 3.5}
                fontSize="9.5"
                fill="#64748B"
                textAnchor="end"
              >
                {AppFormatters.number(labelVal, 1)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {areaPath ? <Path d={areaPath} fill={`${color}1A`} /> : null}

        {validPoints.length > 1 ? (
          <Path d={dPath} fill="none" stroke={color} strokeWidth={2.5} />
        ) : null}

        {validPoints.length <= 36 &&
          validPoints.map((pt, idx) => (
            <Circle
              key={idx}
              cx={xFor(idx)}
              cy={yFor(pt.value)}
              r={validPoints.length === 1 ? 4.5 : 2.8}
              fill={color}
            />
          ))}

        <SvgText x={padL} y={height - 6} fontSize="9.5" fill="#64748B" textAnchor="start">
          {AppFormatters.shortDateTime(validPoints[0].timestamp)}
        </SvgText>
        <SvgText
          x={width - padR}
          y={height - 6}
          fontSize="9.5"
          fill="#64748B"
          textAnchor="end"
        >
          {AppFormatters.shortDateTime(validPoints[validPoints.length - 1].timestamp)} ({unit})
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginVertical: 6,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    color: '#B91C1C',
    fontSize: 12.5,
    fontWeight: '600',
  },
  retryBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    color: '#991B1B',
    fontWeight: '800',
    fontSize: 12.5,
    textDecorationLine: 'underline',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  sensorCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 13,
    marginBottom: 10,
  },
  sensorTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorTypeText: {
    marginLeft: 8,
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  sensorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  sensorValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sensorValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },
  sensorUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  sensorTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 4,
  },
  pumpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    marginBottom: 12,
  },
  pumpCardOn: {
    borderColor: '#86EFAC',
    borderWidth: 1.5,
  },
  pumpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  powerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  pumpTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  pumpSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  pumpStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 12,
  },
  autoBox: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  autoBoxBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  autoBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  autoBoxGray: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  autoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  autoActionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  pendingNote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  failedNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309',
  },
  pumpActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btnOn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnOnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  btnOff: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  btnOffText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13.5,
  },
  kbModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  kbModalOverlayTap: {
    flex: 1,
  },
  kbModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    maxHeight: '88%',
  },
  kbModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  kbModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kbModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  kbModalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
  },
  kbHideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  kbHideBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#15803D',
  },
  kbCloseIconBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
});

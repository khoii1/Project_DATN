import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  KeyboardSafeModal,
  StatTile,
  StatusBadge,
} from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { smartAgriApi } from '../services/api';
import type {
  ActivityLogModel,
  AuthUser,
  CropModel,
  DeviceModel,
  FarmModel,
  FarmStaffAssignmentModel,
  ReportBundleModel,
  ZoneModel,
} from '../types/models';
import { AppFormatters } from '../utils/formatters';

type SectionKey =
  | null
  | 'farms'
  | 'zones'
  | 'crops'
  | 'devices'
  | 'reports'
  | 'logs'
  | 'users'
  | 'profile';

export function MoreScreen() {
  const { user, logout } = useApp();
  const [section, setSection] = useState<SectionKey>(null);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>
              {AppFormatters.roleLabel(user?.role)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSection('profile')}>
            <Ionicons name="settings-outline" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <Text style={styles.groupHeading}>Quản lý Nông trại & Hạ tầng IoT</Text>
        <View style={styles.menuBox}>
          <MenuRow
            icon="leaf-outline"
            color="#16A34A"
            title="Trang trại & Phân quyền nhân sự"
            subtitle="Thêm/sửa trang trại, phân công nhân viên và cấp quyền tưới"
            onPress={() => setSection('farms')}
          />
          <MenuRow
            icon="grid-outline"
            color="#0284C7"
            title="Khu vực canh tác"
            subtitle="Thêm/sửa nhà màng, phân khu tưới tiêu"
            onPress={() => setSection('zones')}
          />
          <MenuRow
            icon="nutrition-outline"
            color="#059669"
            title="Cây trồng & Mùa vụ"
            subtitle="Thêm/sửa giống cây và trạng thái sinh trưởng"
            onPress={() => setSection('crops')}
          />
          <MenuRow
            icon="hardware-chip-outline"
            color="#7C3AED"
            title="Thiết bị điều khiển trung tâm"
            subtitle="Thêm/sửa bộ điều khiển và giám sát trạng thái trực tuyến"
            onPress={() => setSection('devices')}
            last
          />
        </View>

        <Text style={styles.groupHeading}>Thống kê, Nhật ký & Hệ thống</Text>
        <View style={styles.menuBox}>
          <MenuRow
            icon="bar-chart-outline"
            color="#EA580C"
            title="Báo cáo & Xuất dữ liệu CSV"
            subtitle="Thống kê và xuất đủ 4 loại báo cáo CSV tiếng Việt"
            onPress={() => setSection('reports')}
          />
          <MenuRow
            icon="document-text-outline"
            color="#475569"
            title="Nhật ký hoạt động"
            subtitle="Tra cứu và tìm kiếm lịch sử thao tác toàn hệ thống"
            onPress={() => setSection('logs')}
          />
          {isAdmin && (
            <MenuRow
              icon="people-outline"
              color="#2563EB"
              title="Quản lý tài khoản người dùng"
              subtitle="Tạo tài khoản mới, đổi vai trò, khóa/mở khóa người dùng"
              onPress={() => setSection('users')}
            />
          )}
          <MenuRow
            icon="person-circle-outline"
            color="#0F172A"
            title="Hồ sơ cá nhân, Mật khẩu & Máy chủ"
            subtitle="Đổi mật khẩu hoặc cập nhật địa chỉ IP Server"
            onPress={() => setSection('profile')}
            last
          />
        </View>

        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Đăng xuất khỏi tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={section !== null} animationType="slide">
        <View style={styles.subScreen}>
          <View style={styles.subHeader}>
            <TouchableOpacity
              onPress={() => setSection(null)}
              style={{ padding: 6, marginRight: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>
              {section === 'farms'
                ? 'Trang trại & Nhân sự'
                : section === 'zones'
                  ? 'Quản lý Khu vực'
                  : section === 'crops'
                    ? 'Cây trồng & Mùa vụ'
                    : section === 'devices'
                      ? 'Thiết bị điều khiển'
                      : section === 'reports'
                        ? 'Báo cáo & Xuất CSV'
                        : section === 'logs'
                          ? 'Nhật ký hoạt động'
                          : section === 'users'
                            ? 'Quản lý Người dùng'
                            : 'Hồ sơ & Cài đặt'}
            </Text>
          </View>
          {section === 'farms' && <FarmsSubView />}
          {section === 'zones' && <ZonesSubView />}
          {section === 'crops' && <CropsSubView />}
          {section === 'devices' && <DevicesSubView />}
          {section === 'reports' && <ReportsSubView />}
          {section === 'logs' && <LogsSubView />}
          {section === 'users' && <UsersSubView />}
          {section === 'profile' && <ProfileSubView />}
        </View>
      </Modal>
    </View>
  );
}

function MenuRow({
  icon,
  color,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.menuRow,
        !last && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
      ]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function FarmsSubView() {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [farms, setFarms] = useState<FarmModel[]>([]);
  const [staffFarm, setStaffFarm] = useState<FarmModel | null>(null);
  const [staffList, setStaffList] = useState<FarmStaffAssignmentModel[]>([]);
  const [candidates, setCandidates] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Farm Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<FarmModel | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const load = async () => {
    setLoading(true);
    try {
      const res = await smartAgriApi.listFarms({ limit: 100 });
      setFarms(res.items);
    } catch (e) {
      showError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openStaff = async (f: FarmModel) => {
    setStaffFarm(f);
    try {
      const [assigned, cands] = await Promise.all([
        smartAgriApi.listFarmStaff(f.id),
        canManage ? smartAgriApi.listStaffCandidates(f.id) : Promise.resolve([]),
      ]);
      setStaffList(assigned);
      setCandidates(cands);
    } catch (e) {
      showError(e);
    }
  };

  const openCreateFarm = () => {
    setEditingFarm(null);
    setName('');
    setAddress('');
    setArea('');
    setDesc('');
    setStatus('ACTIVE');
    setFormOpen(true);
  };

  const openEditFarm = (f: FarmModel) => {
    setEditingFarm(f);
    setName(f.name);
    setAddress(f.address ?? '');
    setArea(f.areaHectares ? String(f.areaHectares) : '');
    setDesc(f.description ?? '');
    setStatus((f.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormOpen(true);
  };

  const handleDeleteFarm = (f: FarmModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteFarm(f.id);
        setFormOpen(false);
        setEditingFarm(null);
        if (staffFarm?.id === f.id) setStaffFarm(null);
        showSuccess(`Đã xóa trang trại "${f.name}"`);
        await load();
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa trang trại "${f.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa trang trại?',
      `Bạn có chắc chắn muốn xóa "${f.name}"?\nToàn bộ khu vực, cây trồng và thiết bị thuộc trang trại này cũng sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa trang trại', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSaveFarm = async () => {
    Keyboard.dismiss();
    if (name.trim().length < 2) {
      showError('Tên trang trại cần ít nhất 2 ký tự.');
      return;
    }
    const parsedArea = area.trim() ? Number(area.trim().replace(',', '.')) : null;
    if (parsedArea !== null && (!Number.isFinite(parsedArea) || parsedArea <= 0)) {
      showError('Diện tích phải là số lớn hơn 0.');
      return;
    }
    try {
      if (editingFarm) {
        await smartAgriApi.updateFarm(editingFarm.id, {
          name: name.trim(),
          address: address.trim() || null,
          areaHectares: parsedArea,
          description: desc.trim() || null,
          status,
        });
        showSuccess('Đã cập nhật trang trại');
      } else {
        await smartAgriApi.createFarm({
          name: name.trim(),
          address: address.trim() || null,
          areaHectares: parsedArea,
          description: desc.trim() || null,
        });
        showSuccess('Đã tạo trang trại mới');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#16A34A" />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {canManage && (
        <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity onPress={openCreateFarm} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Thêm trang trại mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {farms.map((f) => (
        <View key={f.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <Text style={[styles.itemTitle, { flex: 1 }]}>{f.name}</Text>
            <StatusBadge
              text={AppFormatters.activeStatusLabel(f.status)}
              color={f.status === 'ACTIVE' ? '#16A34A' : '#64748B'}
            />
          </View>
          <Text style={styles.itemSub}>
            Chủ trại: {f.owner?.fullName ?? ''} · {f._count?.zones ?? 0} khu vực ·{' '}
            {f._count?.staffAssignments ?? 0} nhân viên
            {f.areaHectares ? ` · ${f.areaHectares} ha` : ''}
          </Text>
          {f.address ? <Text style={styles.itemSub}>Địa chỉ: {f.address}</Text> : null}
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            {canManage ? (
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity onPress={() => openEditFarm(f)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
                    Chỉnh sửa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteFarm(f)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={() => void openStaff(f)}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                Nhân sự & Quyền tưới →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {staffFarm && (
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Nhân sự: {staffFarm.name}</Text>
          {staffList.length === 0 ? (
            <Text style={styles.itemSub}>Chưa có nhân viên nào được phân công.</Text>
          ) : (
            staffList.map((st) => (
              <View
                key={st.id}
                style={[
                  styles.rowBetween,
                  {
                    marginTop: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#F1F5F9',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                    {st.staff.fullName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {st.staff.email} · Quyền bật/tắt máy bơm
                  </Text>
                </View>
                <Switch
                  value={st.canControlIrrigation}
                  disabled={!canManage}
                  onValueChange={async (v) => {
                    try {
                      await smartAgriApi.updateStaffPermission(
                        staffFarm.id,
                        st.staffId,
                        v,
                      );
                      showSuccess('Đã cập nhật quyền điều khiển tưới');
                      await openStaff(staffFarm);
                    } catch (e) {
                      showError(e);
                    }
                  }}
                />
                {canManage && (
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        await smartAgriApi.removeStaff(staffFarm.id, st.staffId);
                        showSuccess('Đã gỡ nhân viên khỏi trang trại');
                        await openStaff(staffFarm);
                        await load();
                      } catch (e) {
                        showError(e);
                      }
                    }}
                    style={{ marginLeft: 10, padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}

          {canManage && candidates.length > 0 && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
                + Phân công thêm nhân viên vào trang trại:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {candidates.map((cand) => (
                  <TouchableOpacity
                    key={cand.id}
                    onPress={async () => {
                      try {
                        await smartAgriApi.assignStaff(staffFarm.id, cand.id);
                        showSuccess(`Đã phân công ${cand.fullName}`);
                        await openStaff(staffFarm);
                        await load();
                      } catch (e) {
                        showError(e);
                      }
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>+ {cand.fullName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <KeyboardSafeModal
        visible={formOpen}
        title={editingFarm ? 'Cập nhật trang trại' : 'Thêm trang trại mới'}
        onClose={() => setFormOpen(false)}
      >
        <Text style={styles.label}>Tên trang trại</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Nông trại Công nghệ cao Đà Lạt"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Địa chỉ</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Xã / Phường, Quận / Huyện, Tỉnh / Thành phố"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Diện tích canh tác (ha - tùy chọn)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={area}
          onChangeText={setArea}
          placeholder="Ví dụ: 2.5"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Mô tả (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={desc}
          onChangeText={setDesc}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {editingFarm && (
          <>
            <Text style={styles.label}>Trạng thái</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Tạm ngưng'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center' },
                    status === st && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === st && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.outlineBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSaveFarm}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>
              {editingFarm ? 'Lưu thay đổi' : 'Tạo trang trại'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingFarm && (
          <TouchableOpacity
            onPress={() => handleDeleteFarm(editingFarm)}
            style={[
              styles.outlineBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13.5 }}>
              Xóa trang trại này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </ScrollView>
  );
}

function ZonesSubView() {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [zones, setZones] = useState<ZoneModel[]>([]);
  const [farms, setFarms] = useState<FarmModel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneModel | null>(null);
  const [farmId, setFarmId] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const load = async () => {
    try {
      const r = await smartAgriApi.listZones({ limit: 100 });
      setZones(r.items);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = async () => {
    try {
      const fRes = await smartAgriApi.listFarms({ status: 'ACTIVE', limit: 100 });
      setFarms(fRes.items);
      setEditingZone(null);
      setFarmId(fRes.items[0]?.id ?? '');
      setName('');
      setArea('');
      setDesc('');
      setStatus('ACTIVE');
      setFormOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEdit = (z: ZoneModel) => {
    setEditingZone(z);
    setFarmId(z.farmId);
    setName(z.name);
    setArea(z.areaHectares ? String(z.areaHectares) : '');
    setDesc(z.description ?? '');
    setStatus((z.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormOpen(true);
  };

  const handleDeleteZone = (z: ZoneModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteZone(z.id);
        setFormOpen(false);
        setEditingZone(null);
        showSuccess(`Đã xóa khu vực "${z.name}"`);
        await load();
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa khu vực "${z.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa khu vực canh tác?',
      `Bạn có chắc chắn muốn xóa "${z.name}"?\nToàn bộ cây trồng và thiết bị thuộc khu vực này cũng sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa khu vực', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (name.trim().length < 2) {
      showError('Tên khu vực cần ít nhất 2 ký tự.');
      return;
    }
    const parsedArea = area.trim() ? Number(area.trim().replace(',', '.')) : null;
    try {
      if (editingZone) {
        await smartAgriApi.updateZone(editingZone.id, {
          name: name.trim(),
          areaHectares: parsedArea,
          description: desc.trim() || null,
          status,
        });
        showSuccess('Đã cập nhật khu vực');
      } else {
        if (!farmId) {
          showError('Vui lòng chọn trang trại.');
          return;
        }
        await smartAgriApi.createZone({
          farmId,
          name: name.trim(),
          areaHectares: parsedArea,
          description: desc.trim() || null,
        });
        showSuccess('Đã thêm khu vực mới');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {canManage && (
        <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => void openCreate()} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Thêm khu vực mới</Text>
          </TouchableOpacity>
        </View>
      )}

      {zones.map((z) => (
        <View key={z.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{z.name}</Text>
            <StatusBadge
              text={AppFormatters.activeStatusLabel(z.status)}
              color={z.status === 'ACTIVE' ? '#16A34A' : '#64748B'}
            />
          </View>
          <Text style={styles.itemSub}>
            {z.farm?.name ?? ''} · {z._count?.crops ?? 0} cây trồng
            {z.areaHectares ? ` · ${z.areaHectares} ha` : ''}
          </Text>
          {canManage && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 16,
                marginTop: 8,
              }}
            >
              <TouchableOpacity onPress={() => openEdit(z)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                  Chỉnh sửa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteZone(z)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                  Xóa
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <KeyboardSafeModal
        visible={formOpen}
        title={editingZone ? 'Cập nhật khu vực' : 'Thêm khu vực canh tác'}
        onClose={() => setFormOpen(false)}
      >
        {!editingZone && (
          <>
            <Text style={styles.label}>Thuộc trang trại</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {farms.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFarmId(f.id)}
                  style={[
                    styles.chip,
                    { marginRight: 8 },
                    farmId === f.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      farmId === f.id && styles.chipTextActive,
                    ]}
                  >
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Tên khu vực</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Khu B - Nhà màng Dâu tây"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Diện tích (ha - tùy chọn)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={area}
          onChangeText={setArea}
          placeholder="Ví dụ: 0.5"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Mô tả (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={desc}
          onChangeText={setDesc}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {editingZone && (
          <>
            <Text style={styles.label}>Trạng thái</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Tạm ngưng'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center' },
                    status === st && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === st && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.outlineBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>
              {editingZone ? 'Lưu thay đổi' : 'Tạo khu vực'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingZone && (
          <TouchableOpacity
            onPress={() => handleDeleteZone(editingZone)}
            style={[
              styles.outlineBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13.5 }}>
              Xóa khu vực này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </ScrollView>
  );
}

function CropsSubView() {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [crops, setCrops] = useState<CropModel[]>([]);
  const [zones, setZones] = useState<ZoneModel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<CropModel | null>(null);
  const [zoneId, setZoneId] = useState('');
  const [name, setName] = useState('');
  const [variety, setVariety] = useState('');
  const [status, setStatus] = useState<'PLANNED' | 'GROWING' | 'HARVESTED' | 'CANCELLED'>('GROWING');
  const [desc, setDesc] = useState('');

  const load = async () => {
    try {
      const r = await smartAgriApi.listCrops({ limit: 100 });
      setCrops(r.items);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = async () => {
    try {
      const zRes = await smartAgriApi.listZones({ status: 'ACTIVE', limit: 100 });
      setZones(zRes.items);
      setEditingCrop(null);
      setZoneId(zRes.items[0]?.id ?? '');
      setName('');
      setVariety('');
      setStatus('GROWING');
      setDesc('');
      setFormOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEdit = (c: CropModel) => {
    setEditingCrop(c);
    setZoneId(c.zoneId);
    setName(c.name);
    setVariety(c.variety ?? '');
    setStatus(
      (c.status as 'PLANNED' | 'GROWING' | 'HARVESTED' | 'CANCELLED') || 'GROWING',
    );
    setDesc(c.description ?? '');
    setFormOpen(true);
  };

  const handleDeleteCrop = (c: CropModel) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteCrop(c.id);
        setFormOpen(false);
        setEditingCrop(null);
        showSuccess(`Đã xóa cây trồng "${c.name}"`);
        await load();
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa cây trồng "${c.name}"?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa cây trồng?',
      `Bạn có chắc chắn muốn xóa "${c.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa cây trồng', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (name.trim().length < 2) {
      showError('Tên cây trồng cần ít nhất 2 ký tự.');
      return;
    }
    try {
      if (editingCrop) {
        await smartAgriApi.updateCrop(editingCrop.id, {
          name: name.trim(),
          variety: variety.trim() || null,
          status,
          description: desc.trim() || null,
        });
        showSuccess('Đã cập nhật cây trồng');
      } else {
        if (!zoneId) {
          showError('Vui lòng chọn khu vực canh tác.');
          return;
        }
        await smartAgriApi.createCrop({
          zoneId,
          name: name.trim(),
          variety: variety.trim() || null,
          status,
          description: desc.trim() || null,
        });
        showSuccess('Đã thêm cây trồng mới');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {canManage && (
        <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => void openCreate()} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Thêm cây trồng & mùa vụ</Text>
          </TouchableOpacity>
        </View>
      )}

      {crops.map((c) => (
        <View key={c.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>
              {c.name}
              {c.variety ? ` (${c.variety})` : ''}
            </Text>
            <StatusBadge
              text={AppFormatters.cropStatusLabel(c.status)}
              color={c.status === 'GROWING' ? '#16A34A' : '#2563EB'}
            />
          </View>
          <Text style={styles.itemSub}>
            {c.zone?.name ?? ''} · {c.zone?.farm?.name ?? ''}
          </Text>
          {canManage && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 16,
                marginTop: 8,
              }}
            >
              <TouchableOpacity onPress={() => openEdit(c)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                  Chỉnh sửa mùa vụ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCrop(c)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                  Xóa
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <KeyboardSafeModal
        visible={formOpen}
        title={editingCrop ? 'Cập nhật cây trồng' : 'Thêm cây trồng & mùa vụ'}
        onClose={() => setFormOpen(false)}
      >
        {!editingCrop && (
          <>
            <Text style={styles.label}>Khu vực canh tác</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {zones.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  onPress={() => setZoneId(z.id)}
                  style={[
                    styles.chip,
                    { marginRight: 8 },
                    zoneId === z.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      zoneId === z.id && styles.chipTextActive,
                    ]}
                  >
                    {z.name} ({z.farm?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Tên cây trồng</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Cà chua bi / Dưa lưới"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Giống cây (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={variety}
          onChangeText={setVariety}
          placeholder="Ví dụ: F1 Nhật Bản"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Trạng thái mùa vụ</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {(
            [
              ['PLANNED', 'Dự kiến'],
              ['GROWING', 'Đang trồng'],
              ['HARVESTED', 'Đã thu hoạch'],
              ['CANCELLED', 'Đã hủy'],
            ] as const
          ).map(([st, label]) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatus(st)}
              style={[
                styles.chip,
                status === st && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  status === st && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ghi chú kỹ thuật (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={desc}
          onChangeText={setDesc}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.outlineBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>
              {editingCrop ? 'Lưu thay đổi' : 'Tạo cây trồng'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingCrop && (
          <TouchableOpacity
            onPress={() => handleDeleteCrop(editingCrop)}
            style={[
              styles.outlineBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13.5 }}>
              Xóa cây trồng này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </ScrollView>
  );
}

function DevicesSubView() {
  const { user, showSuccess, showError } = useApp();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FARM_OWNER';

  const [devices, setDevices] = useState<DeviceModel[]>([]);
  const [zones, setZones] = useState<ZoneModel[]>([]);
  const [connFilter, setConnFilter] = useState<'' | 'ONLINE' | 'OFFLINE'>('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceModel | null>(null);
  const [zoneId, setZoneId] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'CONTROLLER' | 'GATEWAY' | 'OTHER'>('CONTROLLER');
  const [hardwareModel, setHardwareModel] = useState('ESP32 DevKit V1');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const load = async () => {
    try {
      const r = await smartAgriApi.listDevices({
        connectionStatus: connFilter || undefined,
        limit: 100,
      });
      setDevices(r.items);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    void load();
  }, [connFilter]);

  const openCreate = async () => {
    try {
      const zRes = await smartAgriApi.listZones({ status: 'ACTIVE', limit: 100 });
      setZones(zRes.items);
      setEditingDevice(null);
      setZoneId(zRes.items[0]?.id ?? '');
      setDeviceCode(`ESP32-NODE-${Math.floor(10 + Math.random() * 89)}`);
      setName('Bộ điều khiển ESP32 mới');
      setType('CONTROLLER');
      setHardwareModel('ESP32 DevKit V1');
      setStatus('ACTIVE');
      setFormOpen(true);
    } catch (e) {
      showError(e);
    }
  };

  const openEdit = (d: DeviceModel) => {
    setEditingDevice(d);
    setZoneId(d.zoneId);
    setDeviceCode(d.deviceCode);
    setName(d.name);
    setType((d.type as 'CONTROLLER' | 'GATEWAY' | 'OTHER') || 'CONTROLLER');
    setHardwareModel(d.hardwareModel ?? 'ESP32 DevKit V1');
    setStatus((d.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormOpen(true);
  };

  const handleDeleteDevice = (d: DeviceModel) => {
    const runDelete = async () => {
      try {
        await smartAgriApi.deleteDevice(d.id);
        setFormOpen(false);
        setEditingDevice(null);
        showSuccess(`Đã xóa thiết bị "${d.name}"`);
        await load();
      } catch (e) {
        showError(e);
      }
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `Bạn có chắc chắn muốn xóa thiết bị "${d.name}"?\nToàn bộ cảm biến và máy bơm gắn với thiết bị này cũng sẽ bị xóa.`,
        )
      ) {
        void runDelete();
      }
      return;
    }

    Alert.alert(
      'Xóa thiết bị IoT?',
      `Bạn có chắc chắn muốn xóa "${d.name}"?\nToàn bộ cảm biến, máy bơm và dữ liệu gắn với thiết bị này cũng sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa thiết bị',
          style: 'destructive',
          onPress: () => void runDelete(),
        },
      ],
    );
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (name.trim().length < 2) {
      showError('Tên thiết bị cần ít nhất 2 ký tự.');
      return;
    }
    try {
      if (editingDevice) {
        await smartAgriApi.updateDevice(editingDevice.id, {
          name: name.trim(),
          type,
          hardwareModel: hardwareModel.trim() || null,
          status,
        });
        showSuccess('Đã cập nhật thiết bị');
      } else {
        if (!zoneId) {
          showError('Vui lòng chọn khu vực lắp đặt.');
          return;
        }
        await smartAgriApi.createDevice({
          zoneId,
          deviceCode: deviceCode.trim().toUpperCase(),
          name: name.trim(),
          type,
          hardwareModel: hardwareModel.trim() || null,
        });
        showSuccess('Đã thêm thiết bị IoT mới');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.rowBetween, { marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(
            [
              ['', 'Tất cả'],
              ['ONLINE', 'Trực tuyến'],
              ['OFFLINE', 'Ngoại tuyến'],
            ] as const
          ).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              onPress={() => setConnFilter(val)}
              style={[styles.chip, connFilter === val && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  connFilter === val && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {canManage && (
          <TouchableOpacity onPress={() => void openCreate()} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        )}
      </View>

      {devices.map((d) => (
        <View key={d.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>
              {AppFormatters.deviceTypeLabel(d.type)}
            </Text>
            <StatusBadge
              text={AppFormatters.connectionLabel(d.connectionStatus)}
              color={d.connectionStatus === 'ONLINE' ? '#16A34A' : '#64748B'}
            />
          </View>
          <Text style={[styles.itemTitle, { marginTop: 4 }]}>{d.name}</Text>
          <Text style={styles.itemSub}>
            {d.zone?.name ?? ''} · {d.zone?.farm?.name ?? ''}
            {d.hardwareModel ? ` · ${d.hardwareModel}` : ''}
          </Text>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
              {d.lastSeenAt
                ? `Kết nối cuối: ${AppFormatters.dateTime(d.lastSeenAt)}`
                : 'Chưa ghi nhận kết nối'}
            </Text>
            {canManage && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <TouchableOpacity onPress={() => openEdit(d)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                    Chỉnh sửa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteDevice(d)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}

      <KeyboardSafeModal
        visible={formOpen}
        title={editingDevice ? 'Cập nhật thiết bị IoT' : 'Thêm thiết bị IoT mới'}
        onClose={() => setFormOpen(false)}
      >
        {!editingDevice && (
          <>
            <Text style={styles.label}>Khu vực lắp đặt</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {zones.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  onPress={() => setZoneId(z.id)}
                  style={[
                    styles.chip,
                    { marginRight: 8 },
                    zoneId === z.id && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      zoneId === z.id && styles.chipTextActive,
                    ]}
                  >
                    {z.name} ({z.farm?.name ?? ''})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Mã định danh thiết bị (MQTT Code)</Text>
            <TextInput
              style={styles.input}
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </>
        )}

        <Text style={styles.label}>Tên thiết bị hiển thị</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        <Text style={styles.label}>Vai trò thiết bị</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {(
            [
              ['CONTROLLER', 'Bộ điều khiển'],
              ['GATEWAY', 'Cổng kết nối'],
              ['OTHER', 'Thiết bị khác'],
            ] as const
          ).map(([t, label]) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Dòng mạch phần cứng</Text>
        <TextInput
          style={styles.input}
          value={hardwareModel}
          onChangeText={setHardwareModel}
          placeholder="Ví dụ: ESP32 DevKit V1"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {editingDevice && (
          <>
            <Text style={styles.label}>Trạng thái vận hành</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Tạm ngưng'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center' },
                    status === st && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === st && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.outlineBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>
              {editingDevice ? 'Lưu thay đổi' : 'Tạo thiết bị'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingDevice && (
          <TouchableOpacity
            onPress={() => handleDeleteDevice(editingDevice)}
            style={[
              styles.outlineBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13.5 }}>
              Xóa thiết bị này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </ScrollView>
  );
}

function ReportsSubView() {
  const { showSuccess, showError } = useApp();
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [bundle, setBundle] = useState<ReportBundleModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    smartAgriApi
      .loadReportBundle({ from: from.toISOString(), to: to.toISOString() })
      .then(setBundle)
      .catch(showError)
      .finally(() => setLoading(false));
  }, [days, showError]);

  const shareCsv = async (type: string, label: string) => {
    try {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - (days - 1));
      from.setHours(0, 0, 0, 0);
      const csv = await smartAgriApi.exportReportCsv({
        type,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      await Share.share({
        title: `Báo cáo CSV - ${label}`,
        message: csv,
      });
      showSuccess(`Đã xuất dữ liệu CSV (${label})`);
    } catch (e) {
      showError(e);
    }
  };

  const o = bundle?.overview ?? {};
  const irr = bundle?.irrigation ?? {};
  const al = bundle?.alerts ?? {};

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(
          [
            [1, 'Hôm nay'],
            [7, '7 ngày qua'],
            [30, '30 ngày qua'],
          ] as const
        ).map(([d, label]) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDays(d)}
            style={[styles.chip, days === d && styles.chipActive]}
          >
            <Text style={[styles.chipText, days === d && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => void shareCsv('sensor-readings', 'Cảm biến')}
          style={[styles.primaryBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
        >
          <Text style={styles.primaryBtnText}>CSV Cảm biến</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void shareCsv('device-commands', 'Lệnh tưới')}
          style={[styles.primaryBtn, { flex: 1, marginTop: 0, paddingVertical: 10, backgroundColor: '#0284C7' }]}
        >
          <Text style={styles.primaryBtnText}>CSV Lệnh tưới</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <TouchableOpacity
          onPress={() => void shareCsv('alerts', 'Cảnh báo')}
          style={[styles.outlineBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
        >
          <Text style={styles.outlineBtnText}>CSV Cảnh báo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void shareCsv('devices', 'Thiết bị')}
          style={[styles.outlineBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
        >
          <Text style={styles.outlineBtnText}>CSV Thiết bị</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#16A34A" />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatTile
              label="Tổng mẫu cảm biến"
              value={AppFormatters.number(o.sensorReadingCount, 0)}
              subtitle={`${o.sensorCount ?? 0} cảm biến`}
              icon="analytics-outline"
            />
            <StatTile
              label="Tổng lệnh tưới"
              value={AppFormatters.number(irr.totalCommands, 0)}
              subtitle={`${irr.manualCommands ?? 0} tay · ${irr.automationCommands ?? 0} tự động`}
              icon="water-outline"
              color="#0284C7"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <StatTile
              label="Cảnh báo phát sinh"
              value={AppFormatters.number(al.totalOpened, 0)}
              subtitle={`${al.totalResolved ?? 0} đã xử lý`}
              icon="warning-outline"
              color="#D97706"
            />
            <StatTile
              label="Quy tắc tự động"
              value={`${o.enabledAutomationRuleCount ?? 0}/${o.automationRuleCount ?? 0}`}
              subtitle="Đang kích hoạt"
              icon="flash-outline"
              color="#7C3AED"
            />
          </View>

          {(bundle?.sensors ?? []).map((row, idx) => {
            const type = String(row.sensorType ?? 'TEMP');
            const unit = String(row.unit ?? '');
            return (
              <View key={idx} style={styles.itemCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle}>
                    {AppFormatters.sensorTypeLabel(type)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    {AppFormatters.number(row.readingCount as number, 0)} phép đo
                  </Text>
                </View>
                <Text style={[styles.itemSub, { marginTop: 4 }]}>
                  Thấp nhất: {AppFormatters.number(row.minimum as number, 1)} {unit} · TB:{' '}
                  {AppFormatters.number(row.average as number, 1)} {unit} · Cao nhất:{' '}
                  {AppFormatters.number(row.maximum as number, 1)} {unit}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function LogsSubView() {
  const { showError } = useApp();
  const [logs, setLogs] = useState<ActivityLogModel[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    smartAgriApi
      .listActivityLogs({ limit: 80 })
      .then((r) => setLogs(r.items))
      .catch(showError);
  }, [showError]);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const desc = AppFormatters.cleanDescription(l.description).toLowerCase();
    const actor = (l.user?.fullName ?? 'Hệ thống').toLowerCase();
    return desc.includes(q) || actor.includes(q);
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <TextInput
        style={[styles.input, { backgroundColor: '#FFFFFF', marginBottom: 12 }]}
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm kiếm thao tác hoặc người thực hiện..."
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      {filtered.map((l) => (
        <View key={l.id} style={styles.itemCard}>
          <Text style={{ fontWeight: '700', fontSize: 13.5, color: '#0F172A' }}>
            {AppFormatters.cleanDescription(l.description)}
          </Text>
          <Text style={styles.itemSub}>
            {l.user?.fullName ?? 'Hệ thống'} · {AppFormatters.dateTime(l.createdAt)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function UsersSubView() {
  const { user: currentUser, showSuccess, showError } = useApp();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'FARM_OWNER' | 'STAFF'>('FARM_OWNER');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const load = async () => {
    try {
      const r = await smartAgriApi.listUsers({ limit: 100 });
      setUsers(r.items);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('FARM_OWNER');
    setStatus('ACTIVE');
    setFormOpen(true);
  };

  const openEdit = (u: AuthUser) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setPhone(u.phone ?? '');
    setRole((u.role as 'ADMIN' | 'FARM_OWNER' | 'STAFF') || 'STAFF');
    setStatus((u.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE');
    setFormOpen(true);
  };

  const handleDeleteUser = (u: AuthUser) => {
    const run = async () => {
      try {
        await smartAgriApi.deleteUser(u.id);
        setFormOpen(false);
        setEditingUser(null);
        showSuccess(`Đã xóa tài khoản "${u.email}"`);
        await load();
      } catch (e) {
        showError(e);
      }
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.fullName}" (${u.email})?`)
      ) {
        void run();
      }
      return;
    }
    Alert.alert(
      'Xóa tài khoản người dùng?',
      `Bạn có chắc chắn muốn xóa tài khoản "${u.fullName}" (${u.email})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa tài khoản', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (fullName.trim().length < 2) {
      showError('Họ và tên cần ít nhất 2 ký tự.');
      return;
    }
    try {
      if (editingUser) {
        await smartAgriApi.updateUser(editingUser.id, {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          role,
          status,
        });
        showSuccess('Đã cập nhật tài khoản người dùng');
      } else {
        if (!email.trim().includes('@')) {
          showError('Vui lòng nhập Email hợp lệ.');
          return;
        }
        if (password.length < 8) {
          showError('Mật khẩu cần tối thiểu 8 ký tự (gồm chữ và số).');
          return;
        }
        await smartAgriApi.createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
          role,
        });
        showSuccess('Đã tạo tài khoản người dùng mới');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      showError(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={15} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tạo người dùng mới</Text>
        </TouchableOpacity>
      </View>

      {users.map((u) => (
        <View key={u.id} style={styles.itemCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{u.fullName}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <StatusBadge
                text={AppFormatters.roleLabel(u.role)}
                color="#2563EB"
              />
              <StatusBadge
                text={u.status === 'INACTIVE' ? 'Đã khóa' : 'Hoạt động'}
                color={u.status === 'INACTIVE' ? '#DC2626' : '#16A34A'}
              />
            </View>
          </View>
          <Text style={styles.itemSub}>
            {u.email}
            {u.phone ? ` · ${u.phone}` : ''}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 16,
              marginTop: 8,
            }}
          >
            <TouchableOpacity onPress={() => openEdit(u)}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#15803D' }}>
                Chỉnh sửa vai trò / trạng thái
              </Text>
            </TouchableOpacity>
            {currentUser?.id !== u.id && (
              <TouchableOpacity onPress={() => handleDeleteUser(u)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                  Xóa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <KeyboardSafeModal
        visible={formOpen}
        title={
          editingUser ? 'Cập nhật tài khoản người dùng' : 'Tạo người dùng mới'
        }
        onClose={() => setFormOpen(false)}
      >
        <Text style={styles.label}>Họ và tên</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {!editingUser && (
          <>
            <Text style={styles.label}>Email đăng nhập</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </>
        )}

        <Text style={styles.label}>Số điện thoại (tùy chọn)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {!editingUser && (
          <>
            <Text style={styles.label}>Mật khẩu khởi tạo (tối thiểu 8 ký tự, chữ & số)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </>
        )}

        <Text style={styles.label}>Vai trò phân quyền</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {(
            [
              ['FARM_OWNER', 'Chủ trang trại'],
              ['STAFF', 'Nhân viên'],
              ['ADMIN', 'Quản trị viên'],
            ] as const
          ).map(([r, label]) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.chip,
                { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
                role === r && styles.chipActive,
              ]}
            >
              <Text style={[styles.chipText, role === r && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {editingUser && (
          <>
            <Text style={styles.label}>Trạng thái tài khoản</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {(
                [
                  ['ACTIVE', 'Đang hoạt động'],
                  ['INACTIVE', 'Khóa tài khoản'],
                ] as const
              ).map(([st, label]) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: 'center' },
                    status === st && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === st && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              setFormOpen(false);
            }}
            style={[styles.outlineBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.outlineBtnText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>
              {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </Text>
          </TouchableOpacity>
        </View>
        {editingUser && currentUser?.id !== editingUser.id && (
          <TouchableOpacity
            onPress={() => handleDeleteUser(editingUser)}
            style={[
              styles.outlineBtn,
              { borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginTop: 10 },
            ]}
          >
            <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 13.5 }}>
              Xóa tài khoản này
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardSafeModal>
    </ScrollView>
  );
}

function ProfileSubView() {
  const { user, serverUrl, updateServerUrl, updateCurrentUser, showSuccess, showError } =
    useApp();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [srvInput, setSrvInput] = useState(serverUrl);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Thông tin cá nhân</Text>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity
            onPress={async () => {
              Keyboard.dismiss();
              try {
                const updated = await smartAgriApi.updateProfile(fullName, phone);
                await updateCurrentUser(updated);
                showSuccess('Đã lưu hồ sơ cá nhân');
              } catch (e) {
                showError(e);
              }
            }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Lưu thông tin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Đổi mật khẩu bảo mật</Text>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={curPass}
            onChangeText={setCurPass}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <Text style={styles.label}>Mật khẩu mới (tối thiểu 8 ký tự)</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPass}
            onChangeText={setNewPass}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity
            onPress={async () => {
              Keyboard.dismiss();
              try {
                await smartAgriApi.changePassword(curPass, newPass);
                setCurPass('');
                setNewPass('');
                showSuccess('Đổi mật khẩu thành công');
              } catch (e) {
                showError(e);
              }
            }}
            style={styles.outlineBtn}
          >
            <Text style={styles.outlineBtnText}>Cập nhật mật khẩu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemCard}>
          <Text style={styles.itemTitle}>Kết nối Máy chủ Backend</Text>
          <Text style={styles.label}>Địa chỉ Server URL</Text>
          <TextInput
            style={styles.input}
            value={srvInput}
            onChangeText={setSrvInput}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity
            onPress={async () => {
              Keyboard.dismiss();
              await updateServerUrl(srvInput);
              showSuccess('Đã cập nhật địa chỉ máy chủ');
            }}
            style={styles.outlineBtn}
          >
            <Text style={styles.outlineBtnText}>Lưu địa chỉ Máy chủ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 15,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 19, fontWeight: '800', color: '#15803D' },
  profileName: { fontSize: 15.5, fontWeight: '800', color: '#0F172A' },
  profileEmail: { fontSize: 12.5, color: '#64748B' },
  profileRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    marginTop: 4,
  },
  menuBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  menuSub: { fontSize: 11.5, color: '#64748B', marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 14,
  },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  subScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subHeaderTitle: { fontSize: 16.5, fontWeight: '800', color: '#0F172A' },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 11,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
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
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
    marginBottom: 5,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 13.5 },
});

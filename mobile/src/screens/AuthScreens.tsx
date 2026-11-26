import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { InlineErrorCard, KeyboardSafeModal } from '../components/CommonUI';
import { useApp } from '../context/AppContext';
import { detectDefaultServerUrl, smartAgriApi } from '../services/api';
import { AppFormatters } from '../utils/formatters';

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthFlowScreen() {
  const { login, register, serverUrl, updateServerUrl, showSuccess } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'FARM_OWNER' | 'STAFF'>('FARM_OWNER');
  const [confirmPass, setConfirmPass] = useState('');

  // Forgot password state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [issuedCode, setIssuedCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Server modal state
  const [serverModal, setServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [pingMsg, setPingMsg] = useState('');
  const [pingOk, setPingOk] = useState(false);
  const [pinging, setPinging] = useState(false);

  const switchMode = (next: AuthMode) => {
    setError('');
    setOtpStep(false);
    setIssuedCode('');
    setEmailSent(false);
    setMode(next);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(AppFormatters.friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (fullName.trim().length < 2) {
      setError('Họ và tên cần ít nhất 2 ký tự.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Mật khẩu tối thiểu 8 ký tự, gồm cả chữ cái và chữ số.');
      return;
    }
    if (confirmPass !== password) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
        role,
      });
      showSuccess('Đăng ký tài khoản thành công!');
    } catch (e) {
      setError(AppFormatters.friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập đúng địa chỉ Email đã đăng ký.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await smartAgriApi.requestPasswordReset(email.trim());
      setEmailSent(Boolean(res.emailSent));
      if (!res.emailSent && res.verificationCode) {
        setIssuedCode(res.verificationCode);
        setOtpCode(res.verificationCode);
      } else {
        setIssuedCode('');
        setOtpCode('');
      }
      if (otpStep && res.emailSent) {
        showSuccess('Đã gửi lại mã OTP 6 chữ số mới qua Email!');
      }
      setOtpStep(true);
    } catch (e) {
      setError(AppFormatters.friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Mã xác thực gồm đúng 6 chữ số.');
      return;
    }
    if (
      newPassword.length < 8 ||
      !/[A-Za-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError('Mật khẩu mới tối thiểu 8 ký tự, gồm cả chữ cái và chữ số.');
      return;
    }
    if (confirmPass !== newPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await smartAgriApi.resetPassword({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      showSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setPassword('');
      switchMode('login');
    } catch (e) {
      setError(AppFormatters.friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const testServerConnection = async () => {
    setPinging(true);
    setPingMsg('');
    try {
      await updateServerUrl(serverInput);
      await smartAgriApi.checkHealth();
      setPingOk(true);
      setPingMsg('Kết nối máy chủ thành công, hệ thống đã sẵn sàng!');
    } catch (e) {
      setPingOk(false);
      setPingMsg(AppFormatters.friendlyError(e));
    } finally {
      setPinging(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoBox}>
          <Ionicons name="leaf" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.appTitle}>Nông Nghiệp Thông Minh</Text>
        <Text style={styles.appSub}>
          Giám sát môi trường & điều khiển tưới tự động IoT thời gian thực
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>
            {mode === 'login'
              ? 'Đăng nhập hệ thống'
              : mode === 'register'
                ? 'Đăng ký tài khoản mới'
                : otpStep
                  ? 'Thiết lập mật khẩu mới'
                  : 'Khôi phục mật khẩu'}
          </Text>

          {error ? <InlineErrorCard error={error} /> : null}

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ và tên đầy đủ"
                value={fullName}
                onChangeText={setFullName}
              />
            </>
          )}

          <Text style={styles.label}>Email tài khoản</Text>
          <TextInput
            style={styles.input}
            placeholder="tenban@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Số điện thoại (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                placeholder="0901234567"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>Vai trò sử dụng</Text>
              <View style={styles.roleRow}>
                {(
                  [
                    ['FARM_OWNER', 'Chủ trang trại'],
                    ['STAFF', 'Nhân viên'],
                  ] as const
                ).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setRole(val)}
                    style={[
                      styles.roleChip,
                      role === val && styles.roleChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        role === val && styles.roleChipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {mode !== 'forgot' && (
            <>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Nhập mật khẩu"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'register' && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>
                Xác nhận mật khẩu
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                secureTextEntry={!showPass}
                value={confirmPass}
                onChangeText={setConfirmPass}
              />
            </>
          )}

          {mode === 'forgot' && otpStep && (
            <>
              {emailSent ? (
                <View style={styles.otpBanner}>
                  <Text style={styles.otpBannerText}>
                    Mã OTP 6 chữ số đã gửi tới hộp thư {email.trim()} (hiệu lực 5 phút). Vui lòng kiểm tra Hộp thư đến hoặc mục Spam.
                  </Text>
                </View>
              ) : issuedCode ? (
                <View style={styles.otpBanner}>
                  <Text style={styles.otpBannerText}>
                    Mã xác thực khôi phục (chế độ Local, hiệu lực 5 phút): {issuedCode}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>Mã xác thực 6 chữ số</Text>
                <TouchableOpacity disabled={submitting} onPress={handleRequestOtp}>
                  <Text style={[styles.linkText, { fontSize: 12, marginBottom: 6 }]}>
                    Gửi lại mã OTP
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nhập mã 6 số từ Email"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
              />
              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 8 ký tự (chữ và số)"
                secureTextEntry={!showPass}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Text style={styles.label}>Nhập lại mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu mới"
                secureTextEntry={!showPass}
                value={confirmPass}
                onChangeText={setConfirmPass}
              />
            </>
          )}

          {mode === 'login' && (
            <TouchableOpacity
              onPress={() => switchMode('forgot')}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
            >
              <Text style={styles.linkText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            disabled={submitting}
            onPress={
              mode === 'login'
                ? handleLogin
                : mode === 'register'
                  ? handleRegister
                  : otpStep
                    ? handleResetPassword
                    : handleRequestOtp
            }
            style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login'
                  ? 'Đăng nhập'
                  : mode === 'register'
                    ? 'Đăng ký tài khoản'
                    : otpStep
                      ? 'Đặt lại mật khẩu mới'
                      : 'Nhận mã xác thực'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchLinks}>
            {mode === 'login' ? (
              <TouchableOpacity onPress={() => switchMode('register')}>
                <Text style={styles.linkText}>
                  Chưa có tài khoản? Đăng ký tài khoản mới
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={styles.linkText}>
                  Đã có tài khoản? Quay lại Đăng nhập
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setServerInput(serverUrl);
            setPingMsg('');
            setServerModal(true);
          }}
          style={styles.serverBtn}
        >
          <Ionicons name="server-outline" size={16} color="#334155" />
          <Text style={styles.serverBtnText} numberOfLines={1}>
            Máy chủ: {serverUrl}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardSafeModal
        visible={serverModal}
        title="Cấu hình địa chỉ Máy chủ"
        subtitle="Chọn nhanh hoặc nhập địa chỉ IPv4 của máy tính đang chạy Backend cổng 5000."
        onClose={() => setServerModal(false)}
      >
        <View style={styles.presetWrap}>
          {[
            ['Tự động theo Expo', detectDefaultServerUrl()],
            ['Hotspot KN (172.20.10.2)', 'http://172.20.10.2:5000'],
            ['Máy ảo Android', 'http://10.0.2.2:5000'],
            ['Localhost', 'http://localhost:5000'],
          ].map(([label, url]) => (
            <TouchableOpacity
              key={label}
              onPress={() => setServerInput(url)}
              style={styles.presetChip}
            >
              <Text style={styles.presetChipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={serverInput}
          onChangeText={setServerInput}
          placeholder="http://172.20.10.2:5000"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {pingMsg ? (
          <View
            style={[
              styles.pingBox,
              pingOk ? styles.pingBoxOk : styles.pingBoxErr,
            ]}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: pingOk ? '#15803D' : '#B91C1C',
              }}
            >
              {pingMsg}
            </Text>
          </View>
        ) : null}

        <View style={styles.modalBtnRow}>
          <TouchableOpacity
            disabled={pinging}
            onPress={() => {
              Keyboard.dismiss();
              void testServerConnection();
            }}
            style={styles.outlineBtn}
          >
            <Text style={styles.outlineBtnText}>
              {pinging ? 'Đang thử...' : 'Kiểm tra kết nối'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              Keyboard.dismiss();
              await updateServerUrl(serverInput);
              setServerModal(false);
            }}
            style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]}
          >
            <Text style={styles.primaryBtnText}>Lưu địa chỉ</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  appTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  appSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  cardHeading: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  roleChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  roleChipTextActive: {
    color: '#15803D',
  },
  otpBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 10,
  },
  otpBannerText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  switchLinks: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
  serverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  serverBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  pingBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  pingBoxOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  pingBoxErr: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 13.5,
  },
});

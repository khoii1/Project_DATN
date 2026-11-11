// Offline component/controller tests. All application dependencies are mocked;
// no browser, listener, API, DB, MQTT, credentials or command gateway is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const base = path.join(__dirname, '../src');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(base, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(compiled.outputText, { exports, Intl, Date, AbortController, ...globals, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (['react', 'react/jsx-runtime', 'lucide-react'].includes(name)) return require(name);
    throw Error('Unmocked dependency refused: ' + name);
  } });
  return exports;
}
function harness() {
  const states = [], effects = [];
  let cursor = 0, effectCursor = 0;
  const hooks = { ...React,
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect(fn) { effects[effectCursor++] = fn; },
    useCallback: fn => fn,
    useRef: value => ({ current: value }),
    useId: () => 'synthetic-' + cursor++,
  };
  return { hooks, effects, states, render(Component) { cursor = 0; effectCursor = 0; return Component(); } };
}
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(elements)];
}
function find(tree, predicate) { const result = elements(tree).find(predicate); assert.ok(result, 'Expected element'); return result; }
test('application render-error boundary offers a visible fallback without automatic reload', () => {
  let reloads = 0;
  const module = load('App.tsx', { './routes/AppRoutes': { AppRoutes() {} }, './contexts/AuthProvider': { AuthProvider() {} } }, { window: { location: { reload() { reloads++; } } } });
  const app = module.default();
  const boundary = new app.type(app.props);
  assert.equal(boundary.render(), app.props.children);
  boundary.state = app.type.getDerivedStateFromError(Error('synthetic render failure'));
  const fallback = boundary.render();
  assert.equal(fallback.props.role, 'alert'); assert.equal(reloads, 0);
  assert.match(renderToStaticMarkup(fallback), /Không thể hiển thị trang/);
  find(fallback, e => e.type === 'button').props.onClick(); assert.equal(reloads, 1);
});
const sensorTypes = load('types/sensor.ts');
const severity = load('types/alert.ts');
const { SensorValueCard } = load('components/sensors/SensorValueCard.tsx', {
  '../../types/sensor': sensorTypes, '../../types/alert': severity,
});
for (const value of [null, NaN, Infinity]) test('missing/nonfinite sensor data is never normal: ' + value, () => {
  const html = renderToStaticMarkup(React.createElement(SensorValueCard, { type: 'TEMP', value, recordedAt: null, alertSeverity: 'INFO' }));
  assert.match(html, /Chưa nhận dữ liệu/); assert.doesNotMatch(html, /Bình thường|Thông tin/);
});
for (const [type, unit] of [['TEMP', '°C'], ['AIR_HUMIDITY', '%'], ['SOIL_MOISTURE', '%'], ['LIGHT', 'lux']]) test('sensor zero, unit, UTC+7 and no implied trust: ' + type, () => {
  const html = renderToStaticMarkup(React.createElement(SensorValueCard, { type, value: 0, recordedAt: '2026-11-05T00:00:00Z' }));
  assert.ok(html.includes('0 ' + unit)); assert.match(html, /07:00:00|7:00:00/); assert.match(html, /UTC\+7/); assert.match(html, /Chưa đánh giá/);
  if (type === 'SOIL_MOISTURE') assert.match(html, /hiệu chuẩn.*chưa được xác minh/);
});
test('invalid timestamp renders fallback instead of throwing RangeError', () => {
  const html = renderToStaticMarkup(React.createElement(SensorValueCard, { type: 'TEMP', value: 20, recordedAt: 'broken' }));
  assert.match(html, /Thời gian đo không hợp lệ/);
});
for (const unit of ['°C', '%', 'lux']) test('history chart preserves aggregated samples and UTC+7 tooltip: ' + unit, () => {
  const widgets = Object.fromEntries(['CartesianGrid', 'Line', 'LineChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(name => [name, function Widget() {}]));
  const { SensorHistoryChart } = load('components/sensors/SensorHistoryChart.tsx', { recharts: widgets });
  const points = [{ timestamp: '2026-11-05T00:00:00Z', value: 20, min: 10, max: 30, count: 3 }];
  const original = JSON.stringify(points);
  const chart = SensorHistoryChart({ points, unit, loading: false, rangeDays: 1 });
  assert.match(chart.props['aria-label'], /1 bucket/);
  const tooltip = find(chart, element => element.type === widgets.Tooltip).props.content({ active: true, payload: [{ payload: points[0] }] });
  const html = renderToStaticMarkup(tooltip);
  assert.match(html, /07:00:00|7:00:00/); assert.match(html, /Số mẫu: 3/);
  assert.ok(html.includes('10 ' + unit)); assert.ok(html.includes('30 ' + unit));
  assert.equal(JSON.stringify(points), original);
  assert.equal(find(chart, element => element.type === widgets.Line).props.connectNulls, false);
});
test('history chart loading and empty states stay distinct', () => {
  const { SensorHistoryChart } = load('components/sensors/SensorHistoryChart.tsx', { recharts: {} });
  assert.equal(SensorHistoryChart({ points: [], unit: '%', loading: true, rangeDays: 1 }).props['aria-label'], 'Đang tải biểu đồ');
  assert.match(renderToStaticMarkup(SensorHistoryChart({ points: [], unit: '%', loading: false, rangeDays: 1 })), /Không có dữ liệu/);
});
test('protected route preserves history query and hash after login', () => {
  function Navigate() {}
  const { ProtectedRoute } = load('components/auth/ProtectedRoute.tsx', {
    'react-router-dom': { Navigate, useLocation: () => ({ pathname: '/sensors/history', search: '?sensorId=fixture&range=30d', hash: '#readings' }) },
    '../../hooks/useAuth': { useAuth: () => ({ isAuthenticated: false, isLoading: false }) }, './AuthLoading': {},
  });
  assert.equal(ProtectedRoute({ children: null }).props.state.from, '/sensors/history?sensorId=fixture&range=30d#readings');
});
test('login trims only email, preserves password bytes, has no hardcoded demo credential', async () => {
  const h = harness(), calls = [];
  const { LoginPage } = load('pages/auth/LoginPage.tsx', {
    react: h.hooks, 'react-router-dom': { useNavigate: () => () => {}, useLocation: () => ({ state: null }) },
    '../../hooks/useAuth': { useAuth: () => ({ login: async input => calls.push(input) }) },
    '../../services/api': { getApiErrorMessage: () => 'Failed' },
  });
  let tree = h.render(LoginPage);
  find(tree, e => e.type === 'input' && e.props.type === 'email').props.onChange({ target: { value: ' owner@example.invalid ' } });
  find(tree, e => e.type === 'input' && e.props.type === 'password').props.onChange({ target: { value: ' synthetic secret ' } });
  tree = h.render(LoginPage);
  await find(tree, e => e.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 1); assert.equal(calls[0].email, 'owner@example.invalid'); assert.equal(calls[0].password, ' synthetic secret ');
  assert.doesNotMatch(fs.readFileSync(path.join(base, 'pages/auth/LoginPage.tsx'), 'utf8'), /admin@smartagri\.local|Admin123/);
});
test('topbar routes alerts, renders open alert badge, and routes profile/settings/security', async () => {
  const h = harness(), navigations = [];
  const { Topbar } = load('components/layout/Topbar.tsx', {
    react: h.hooks, 'react-router-dom': { useLocation: () => ({ pathname: '/sensors/history' }), useNavigate: () => value => navigations.push(value) },
    '../../constants/navigation': { pageTitleByPath: { '/sensors': 'Cảm biến' } }, '../../types/auth': { roleLabels: { ADMIN: 'Admin' } },
    '../../hooks/useAuth': { useAuth: () => ({ user: { id: 'u1', fullName: 'Admin User', role: 'ADMIN' } }) },
    '../../services/alert.service': { alertService: { summary: async () => ({ open: 4, active: 5, acknowledged: 1, critical: 2, warning: 2, resolvedToday: 0 }) } },
  });
  const render = () => h.render(() => Topbar({ onOpenMobile() {} }));
  let tree = render();
  const cleanup = h.effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  tree = render();
  assert.match(renderToStaticMarkup(tree), /4 cảnh báo đang mở/);
  find(tree, e => e.type === 'button' && e.props['aria-label'] === 'Thông báo').props.onClick();
  find(tree, e => e.type === 'button' && e.props['aria-label'] === 'Menu tài khoản').props.onClick();
  tree = render();
  const items = elements(tree).filter(e => e.props?.role === 'menuitem');
  items[0].props.onClick(); items[1].props.onClick(); items[2].props.onClick();
  assert.deepEqual(navigations, ['/alerts', '/settings#profile', '/settings', '/settings#security']);
  cleanup();
});
for (const role of ['ADMIN', 'STAFF']) test('settings renders profile & password forms and role-gates administration: ' + role, async () => {
  const h = harness(), profileCalls = [], passwordCalls = [], updatedUsers = [];
  const { SettingsPage } = load('pages/settings/SettingsPage.tsx', {
    react: h.hooks,
    'react-router-dom': {
      Link: ({ to, children }) => React.createElement('a', { href: to }, children),
      useLocation: () => ({ hash: '#profile' }),
    },
    '../../components/common/PageHeader': { PageHeader: () => null },
    '../../types/auth': { roleLabels: { ADMIN: 'Admin', STAFF: 'Staff' } },
    '../../services/api': { getApiErrorMessage: () => 'Lỗi cập nhật' },
    '../../services/auth.service': {
      authService: {
        updateProfile: async input => { profileCalls.push(input); return { id: 'u1', fullName: input.fullName, email: 'synthetic@example.invalid', phone: input.phone, role, status: 'ACTIVE' }; },
        changePassword: async input => { passwordCalls.push(input); },
      },
    },
    '../../hooks/useAuth': {
      useAuth: () => ({
        user: { id: 'u1', fullName: 'Synthetic Operator', email: 'synthetic@example.invalid', phone: '0901234567', role, status: 'ACTIVE' },
        updateUser: u => updatedUsers.push(u),
      }),
    },
  });
  let tree = h.render(SettingsPage);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Synthetic Operator/);
  assert.match(html, /Cập nhật hồ sơ cá nhân/);
  assert.match(html, /Đổi mật khẩu bảo mật/);
  assert.equal(html.includes('href="/users"'), role === 'ADMIN');

  find(tree, e => e.props?.['aria-label'] === 'Họ và tên').props.onChange({ target: { value: '  Updated Operator  ' } });
  find(tree, e => e.props?.['aria-label'] === 'Số điện thoại').props.onChange({ target: { value: ' 0987654321 ' } });
  tree = h.render(SettingsPage);
  const forms = elements(tree).filter(e => e.type === 'form');
  await forms[0].props.onSubmit({ preventDefault() {} });
  assert.equal(profileCalls.length, 1);
  assert.equal(profileCalls[0].fullName, 'Updated Operator');
  assert.equal(profileCalls[0].phone, '0987654321');
  assert.equal(updatedUsers.length, 1);

  find(tree, e => e.props?.['aria-label'] === 'Mật khẩu hiện tại').props.onChange({ target: { value: 'OldPass123' } });
  find(tree, e => e.props?.['aria-label'] === 'Mật khẩu mới').props.onChange({ target: { value: 'NewPass456' } });
  find(tree, e => e.props?.['aria-label'] === 'Xác nhận mật khẩu mới').props.onChange({ target: { value: 'NewPass456' } });
  tree = h.render(SettingsPage);
  await elements(tree).filter(e => e.type === 'form')[1].props.onSubmit({ preventDefault() {} });
  assert.equal(passwordCalls.length, 1);
  assert.equal(passwordCalls[0].currentPassword, 'OldPass123');
  assert.equal(passwordCalls[0].newPassword, 'NewPass456');
});
function reportHarness() {
  const h = harness(), requests = [];
  const service = {};
  for (const name of ['overview', 'sensors', 'alerts', 'irrigation', 'automation']) service[name] = (_, signal) => new Promise(resolve => requests.push({ name, signal, resolve }));
  const { ReportsPage } = load('pages/reports/ReportsPage.tsx', {
    react: h.hooks, recharts: {}, '../../components/common/PageHeader': {},
    '../../services/api': { getApiErrorMessage: () => 'Synthetic failure' }, '../../services/report.service': { reportService: service },
    '../../services/farm.service': { farmService: {} }, '../../services/zone.service': { zoneService: { list: async () => { throw Error('synthetic'); } } },
  });
  return { ...h, requests, render: () => h.render(ReportsPage) };
}
for (const emptyLabel of ['Từ ngày', 'Đến ngày']) test('reports rejects missing date without throwing or changing last valid query: ' + emptyLabel, () => {
  const h = reportHarness(), before = h.render();
  find(before, e => e.props?.['aria-label'] === emptyLabel).props.onChange({ target: { value: '' } });
  const tree = h.render();
  find(tree, e => e.type === 'button' && e.props.onClick?.name === 'apply').props.onClick();
  assert.ok(h.states.includes('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc hợp lệ'));
  assert.equal(h.requests.length, 0);
});
test('aborted report response never commits stale overview', async () => {
  const h = reportHarness(); h.render();
  const cleanup = h.effects[2]();
  assert.equal(h.requests.length, 5); cleanup();
  for (const req of h.requests) req.resolve({ marker: 'stale-response' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.states.some(state => state?.marker === 'stale-response'), false);
});
test('report zone lookup rejection becomes visible feedback, not unhandled rejection', async () => {
  const h = reportHarness();
  find(h.render(), e => e.props?.['aria-label'] === 'Trang trại báo cáo').props.onChange({ target: { value: 'synthetic-farm' } });
  h.render(); const cleanup = h.effects[1]();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(h.states.includes('Synthetic failure')); cleanup();
});
test('activity logs reject cleared dates before filter serialization', () => {
  const h = harness();
  const { ActivityLogsPage } = load('pages/activity-logs/ActivityLogsPage.tsx', {
    react: h.hooks, '../../components/common/PageHeader': {}, '../../services/activity-log.service': {},
    '../../services/api': {}, '../../services/farm.service': {}, '../../services/report.service': {},
  });
  let tree = h.render(ActivityLogsPage);
  find(tree, e => e.props?.['aria-label'] === 'Nhật ký từ ngày').props.onChange({ target: { value: '' } });
  tree = h.render(ActivityLogsPage);
  find(tree, e => e.type === 'button' && e.props.onClick?.name === 'apply').props.onClick();
  assert.ok(h.states.includes('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc hợp lệ'));
});
test('confirmation dialog names, Escape and keyboard focus cycle use fake DOM only', () => {
  const h = harness(); let cancelled = 0, focused = '';
  const first = { focus: () => { focused = 'first'; } }, last = { focus: () => { focused = 'last'; } };
  const fakeDocument = { activeElement: first };
  const { ConfirmDialog } = load('components/common/ConfirmDialog.tsx', { react: h.hooks }, { document: fakeDocument });
  const props = { title: 'Synthetic', description: 'Offline', confirmLabel: 'OK', onCancel() { cancelled++; }, onConfirm: async () => {} };
  const tree = h.render(() => ConfirmDialog(props));
  assert.ok(tree.props['aria-labelledby']); assert.ok(tree.props['aria-describedby']);
  tree.props.ref.current = { querySelectorAll: () => [first, last] };
  tree.props.onKeyDown({ key: 'Tab', shiftKey: true, preventDefault() {} }); assert.equal(focused, 'last');
  fakeDocument.activeElement = last;
  tree.props.onKeyDown({ key: 'Tab', shiftKey: false, preventDefault() {} }); assert.equal(focused, 'first');
  tree.props.onKeyDown({ key: 'Escape', preventDefault() {} }); assert.equal(cancelled, 1);
  const pending = h.render(() => ConfirmDialog({ ...props, loading: true }));
  pending.props.onKeyDown({ key: 'Escape', preventDefault() {} }); assert.equal(cancelled, 1);
});

// Captures actual offline test output; never loads application startup or MQTT.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const args = ['--require', './scripts/acceptance-offline-guard.cjs', '--test', '--test-reporter=spec', 'backend/scripts/shadow-irrigation.test.cjs'];
const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
const output = (result.stdout || '') + (result.stderr || '');
fs.writeFileSync(path.join(__dirname, 'shadow-tests-output.txt'), output, {flag:'wx'});
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const lines = output.split(/\r?\n/);
const summary = lines.filter(l => /[ℹ] (tests|pass|fail|cancelled|skipped|duration_ms)/.test(l));
const cases = lines.filter(l => /^✔/.test(l) && /soil boundary 18 |hysteresis |pulse ->|ACK_TIMEOUT |ACK_REJECTED |daily run|per-cycle cap|UTC\+7 budget|emergency stop|fail closed: offline |fail closed: stale recordedAt|fail closed: clock unhealthy|production source never/.test(l));
const ok = result.status === 0 && summary.some(l => /pass 92$/.test(l));
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>Kết quả kiểm thử logic tưới tự động</title><style>body{margin:0;background:#ecf3ef;color:#173d30;font-family:Segoe UI,sans-serif;padding:48px}main{max-width:1320px;margin:auto}.label{font-size:14px;letter-spacing:2px}h1{font-size:36px;margin:14px 0}p{font-size:18px;line-height:1.6}.summary{background:white;border-radius:16px;padding:22px 28px;margin:24px 0;display:flex;justify-content:space-between;align-items:center}.pass{font-size:38px;font-weight:700;color:#147844}.terminal{background:#10251e;color:#d8f7e7;padding:28px;border-radius:16px;font:16px/1.65 Consolas,monospace;white-space:pre-wrap}.note{border-left:5px solid #c18b27;background:#fff8e8;padding:16px 22px;margin-top:24px;color:#77510c}footer{font-size:14px;margin-top:22px;color:#5a7569}</style><main><div class="label">SMART AGRICULTURE · SOFTWARE TEST EVIDENCE</div><h1>Kết quả kiểm thử logic tưới tự động</h1><p>Chạy thực tế bộ kiểm thử offline của SHADOW engine · Không kết nối MQTT hoặc database.</p><div class="summary"><span class="pass">${ok ? '92 / 92 PASS' : 'TEST FAILED'}</span><span>Native exit code: ${result.status}<br>Thời điểm: ${escape(new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))} (UTC+7)</span></div><div class="terminal">$ node --require ./scripts/acceptance-offline-guard.cjs --test<br>  --test-reporter=spec backend/scripts/shadow-irrigation.test.cjs<br><br>${escape(cases.join('\n'))}<br><br>${escape(summary.join('\n'))}</div><div class="note"><b>Phạm vi bằng chứng:</b> kiểm thử logic phần mềm bằng fixture/mô phỏng. Không phải nghiệm thu tưới tự động trên phần cứng; không gửi ON/OFF, không kích hoạt bơm.</div><footer>Trích từ stdout thực tế · Log đầy đủ: shadow-tests-output.txt · Chỉ hiển thị một số test tiêu biểu, tổng số lấy từ test runner.</footer></main></html>`;
fs.writeFileSync(path.join(__dirname, 'shadow-test-results.html'), html, {flag:'wx'});
console.log(JSON.stringify({exitCode:result.status,summary,selectedCases:cases.length,report:'shadow-test-results.html'}));
process.exitCode = ok ? 0 : 1;

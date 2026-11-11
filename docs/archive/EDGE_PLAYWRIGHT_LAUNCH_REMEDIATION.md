# Edge/Playwright launch remediation — offline review

Ngày 06/11/2026. Phạm vi: đọc evidence/source, đề xuất helper mới và synthetic tests. Không thực thi browser, Playwright live, Website, database hoặc MQTT.

## 1. Evidence và timeline

Đã đối chiếu capability/cleanup/preparation reports, `smoke.cjs`, `run-once.ps1`, `identity.json`, `browser-arguments.json`, `edge-diagnostic.log`, `parent-native.json` trong run `edge-capability-1793934788305-b063f271`, cùng Phase AB/AC và installed Playwright source/types. Primary JSON/native evidence được ưu tiên hơn mô tả trong báo cáo.

- Smoke cũ: parent17896 → Node19068 → Edge19708. Edge creation UTC `2026-11-06T03:17:51.0849419Z`; OS spawn thành công, đúng một root launch.
- `launchPersistentContext` timeout18 giây, chưa trả context/page. Parent watchdog30 giây ghi elapsed30058ms, native Node/Edge exit còn UNKNOWN, Edge exitFILETIME0; không phải native exit0.
- `outcome.timeout=false` là timer tổng25 giây chưa kích hoạt; không phủ nhận Playwright launch timeout18 giây.
- Historical cleanup đã hoàn tất qua reconciliation riêng lúc `03:41:32.4170647Z`: owned graph rỗng. Raw cleanup receipt ban đầu PARTIAL vì conhost bị bỏ qua được giữ nguyên. Cleanup không biến smoke thất bại thành PASS.
- AB: Edge24700 exit0 sau khoảng2.6 giây trước usable Browser, Node1668 exit3; khác lần timeout hiện tại. AB không giữ đủ stderr để truy ngược cùng nguyên nhân. AC xác định lỗi exit propagation ở launcher lịch sử là vấn đề riêng, xảy ra sau launch rejection.

## 2. Phân loại nguyên nhân

| Finding | Phân loại | Bằng chứng và giới hạn |
|---|---|---|
| Environment không nhất quán với Windows profile đã đăng ký | **CONFIRMED_DEFECT trong construction/identity assumptions** | Parent closed env chỉ có SystemRoot/WINDIR/PATH/TEMP/TMP. Child factory gán USERPROFILE/APPDATA/LOCALAPPDATA sang private `profile`, `profile/roaming`, `profile/local`; đây không phải known-folder values của operator. Chưa chứng minh đây là nguyên nhân timeout. |
| Sự không nhất quán trên gây Local App Data lookup/launch failure | **SUPPORTED_HYPOTHESIS** | stderr có `Unable to get local app data path` và PathService key112/token0x3F0. Chưa có trace API trong Edge hoặc controlled comparison. |
| Timeout không hoàn tất lifecycle | **CONFIRMED_DEFECT** | Parent còn thấy8 Edge children, pipe drain chưa hoàn tất. Đặt Node exitCode không bảo đảm process thoát khi còn child/pipe handles. Guard chặn kill và parent chỉ đóng observation handles; phải cleanup bằng approval riêng sau đó. Không chứng minh đây là nguyên nhân handshake ban đầu. |
| Thiếu user-data-dir argument | **Không khớp evidence** | OS/arguments evidence có đúng `--user-data-dir=<private run>\tmp\user-data` và `--remote-debugging-pipe`. Dù stderr báo non-default directory, chưa biết Edge resolve/classify đường dẫn ra sao. Không tự thêm flag trùng hoặc đổi sandbox. |
| `kTokenRequestFailed` / `kDLLInvalidAccountId` gây timeout | **UNKNOWN** | Có lỗi Edge account/image-fetch; chưa có chuỗi nhân quả tới CDP. Không đồng nhất với lỗi MQTT hay application credentials; không có application secrets trong allowlist. |
| DevTools pipe/handshake | **UNKNOWN về nguyên nhân cụ thể** | Launch chưa trả context. Source connect chờ Browser.getVersion, auto-attach/context initialization; không có per-method milestone để xác định lời gọi nào không hoàn tất. Chưa có bằng chứng pipe wiring hỏng. |
| NTFS chặn Edge đọc private profile | **UNKNOWN, chưa có bằng chứng denial** | Folder tồn tại, đúng owner, không reparse. Profile/roaming/local/tmp có protected operator-only DACL; user-data kế thừa một ACE operator từ private parent. Đây không tự chứng minh renderer/sandbox token có quyền đủ. Không đổi ACL để ép PASS. |
| Edge156 và Playwright1.62.1 không tương thích | **SUPPORTED_HYPOTHESIS / runtime NOT_VERIFIED** | Bundled browser metadata là Chromium151.0.7922.34/revision1234; installed types cảnh báo custom executable không được bảo đảm như bundled version. Không có protocol incompatibility evidence; không upgrade/downgrade hoặc fallback. |

Vì vậy **environment root cause = HYPOTHESIS**, không phải đã chứng minh lỗi launch. Các stderr được giữ là triệu chứng riêng.

## 3. Windows folders và privacy review

Read-only `.NET Environment.GetFolderPath` dưới operator SID `S-1-5-21-1432835263-483988321-3159128977-1001` trả:

| Key | Registered/current operator folder |
|---|---|
| USERPROFILE | `C:\Users\Acer Swift3` |
| APPDATA | `C:\Users\Acer Swift3\AppData\Roaming` |
| LOCALAPPDATA | `C:\Users\Acer Swift3\AppData\Local` |

Đây là kết quả API của observer hiện tại, không phải trace known-folder API bên trong Edge. Environment spoofing không bảo đảm mọi Windows API cùng đổi sang đường dẫn giả; explicit userDataDir cũng không thay Windows account/profile identity.

Đề xuất giữ ba folder hợp lệ, nhưng chỉ truyền allowlist8 biến. Giữ private TEMP/TMP và explicit private userDataDir; không dùng personal browser profile, cookies, storageState hay application secrets. PATH chỉ System32, không NODE_OPTIONS/DEBUG/proxy/JWT/DB/MQTT env kế thừa.

**Rủi ro còn lại:** Edge chạy cùng Windows SID, có thể truy vấn OS/account/known folders và background network. Private userDataDir không phải tài khoản Windows riêng hoặc network sandbox; route abort chỉ áp dụng page sau khi context tồn tại. Phương án này hợp lý để kiểm tra giả thuyết, nhưng không hứa cô lập riêng tư hoàn toàn. Phiên smoke mới phải nêu rõ giới hạn đó; không tự sửa WAM, registry, Defender hoặc sandbox.

## 4. Minimal private candidate

Private directory mới, ngoài repository và ngoài evidence cũ:

`C:\Users\Acer Swift3\AppData\Local\SmartAgricultureBrowserSmoke\edge-remediation-fe617ef44a2946fa9767887a034c43b7`

Owner là operator; protected DACL operator-only, FullControl. Không sửa ACL của thư mục cũ. File mới kế thừa operator-only từ thư mục private.

- `smoke-environment.candidate.cjs`: pure helper, không import Playwright, không spawn/network/file writes. Khi gọi CLI trực tiếp chỉ từ chối `PREPARATION_ONLY_NO_EXECUTOR`, exit3; chưa gọi CLI này trong lượt review.
- `INTEGRATION_PROPOSAL.md`: diff tối thiểu thay env factory trong **helper mới**, receipt từ parent trước khi clear environment, và điều kiện tích hợp. Không patch old launcher/helper hoặc project source.
- `synthetic.test.cjs`, `synthetic.tap`, `offline-result.json`: fixture/fake evidence, không credentials.

Candidate kiểm tra current-operator receipt, canonical Windows paths, private path/owner/DACL, allowlist, private profile và argument safety. Receipt JSON không tự chứng minh identity: future parent phải capture/verify độc lập và inspect cả ancestors/reparse trước launch. Redirected/reparse profiles chưa hỗ trợ thì STOP để review.

Giữ launchPersistentContext/headless/sandboxtrue/timeout18s/serviceWorkersblock/viewport1280×720 và pipe transport; không thêm args, CDP TCP, channel hoặc fallback. Installed `_innerLaunchWithRetries` có nhánh retry cho lỗi `Inconsistency detected by ld.so`; future executor phải giữ spawn boundary max1 ở native boundary trước khi load Playwright, kể cả library muốn retry. Không patch node_modules.

Policy timeout giữ native UNKNOWN tới khi có held-handle evidence. Không lấy JSON flow success thay native completion. Graceful close tối đa một lần khi ownership đã xác minh. Timeout/unknown ownership không tự kill; giữ evidence và xử lý cleanup theo quyền được cấp riêng. Candidate chưa tích hợp executor hoặc cấp quyền termination.

## 5. Offline verification

**29/29 tests PASS**, Node test native exit0; Node syntax native exit0. Lần đầu25/25, sau đó thêm4 fake-flow tests và chạy lại29/29; không chạy system acceptance.

Kiểm thử: exact env allowlist và secret exclusion; missing/wrong receipt/SID; canonical/missing/reparse paths; private owner/protected ACL; reject personal browser profile; unchanged sandbox/options; exact private-dir/pipe args; reject TCP/no-sandbox/URL; PID reuse/owner mismatch; one-shot spawn kể cả failure; timeout/native UNKNOWN/nonzero; owned cleanup policy; fixture byte/hash immutability. Fake browser flow kiểm tra success, launch rejection, timeout/late completion fence và page error close-once. Tests không tạo browser, TCP connection hoặc file screenshot; fake flow import chỉ builtins từ helper cũ, không gọi real executor.

| Artifact | SHA256 |
|---|---|
| New environment candidate | `b1387aaf769b20b7a9fa65a371c8b8a500accdbd9d05c1c99c9e98f7d5f09b5d` |
| New synthetic tests | `780dde5a22579d6cb8afa61b30717a0ef998d6030143dc11153ed153713d9425` |
| Original smoke.cjs, unchanged | `61e6613202d7cb7aae9d7112079ea6c421d77b9fcf46d82d29229c8f665aeee3` |
| Original run-once.ps1, unchanged | `2df5f98a50fd13640b812cf0e233e3d025dd6c4e8e2fdbd0806c552992e4fc64` |
| Original diagnostic log, unchanged | `3d83a6617d965c7c27e1d9bb10bd527e4461fbca574176f926760c2192274d05` |
| Original parent-native, unchanged | `7d730b9a64ce4ecc08dd98884f19a7afff31ca518b2d334f3b18bb5043a0c2ca` |
| Original browser arguments, unchanged | `d9719783741c71268fe4c448ce389860ca87bff8ca3431127a21e775d1f9fa30` |

Manifest revision10 SHA256 vẫn `47e8072cdc0a711dd277c5468976b6deb0d297264b41b1ce83a02f6ebf72e3bb`; kiểm tra actual250 source pins +4 runtime binary pins +4 offline-test pins: **0 drift**. Không đổi source Website, dependencies, manifest, existing launchers hoặc old evidence. Không dùng fake PASS làm bằng chứng browser capability.

## 6. Bước tiếp theo và điểm dừng

Có thể đề xuất **ONE CONTROLLED CAPABILITY SMOKE** với approval mới: một Edge about:blank, private run/profile/TEMP, env allowlist đã đánh giá, max1 native spawn/no fallback, timeout hữu hạn, độc lập native exit/ownership evidence. Trước khi chạy phải review/pin bản executor mới đã tích hợp receipt inspector và candidate, giữ original safety gates; không gọi lại launcher bound approval cũ. Phạm vi approval mới cần nêu OS-profile/background-network giới hạn và cách xử lý owned processes nếu timeout. Không bao gồm Website/DB/MQTT hoặc điều khiển bơm.

```yaml
EDGE PLAYWRIGHT LAUNCH REVIEW:
  Historical cleanup: COMPLETE
  Environment defect: HYPOTHESIS
  Playwright compatibility: REVIEWED
  Minimal remediation: PREPARED
  Synthetic tests: 29/29 PASS
  Actual Edge launch: NOT_EXECUTED
  Playwright handshake: NOT_VERIFIED
  Active frontend manifest: REV10 UNCHANGED
  Website live attempts: 0/1 UNCHANGED
  Next approval: ONE CONTROLLED CAPABILITY SMOKE
```

STOP sau offline preparation. Không tự tiêu thụ approval mới, không start Website/PostgreSQL/MQTT, không tạo DeviceCommand, không ON/OFF, không firmware/hardware/Automation.

# Tổng hợp kết quả kiểm thử

05/11/2026. Chỉ phần “Chạy trong đợt này” là kết quả mới. Các suite lịch sử khác phiên/snapshot có thể trùng tests; **không cộng tổng** thành một release test count.

## Bằng chứng kế thừa

| Nguồn | Kết quả thực tế | Giới hạn |
|---|---|---|
| [Software DEV29/10](archive/MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md), [completion](archive/PROJECT_COMPLETION_STATUS.md) | CRUD/RBAC/auth/alerts/polling và4ca pagination cuối PASS trong DEV/SIMULATOR | Không phần cứng/production, không bản website historical sau AW |
| [13.5A.1](archive/PHASE13_5A1_SQL_INTEGRATION_AND_RUNTIME_DIAGNOSTICS.md) |59/59 PostgreSQL integration thật;501/501 offline, backend typecheck PASS | TEST55433; không migration/wiring production hoặc power-loss corruption test |
| [13.5C.7](archive/PHASE13_5C7_RESTORE_VERIFICATION_ONLY.md) | Restore đã có:15tables/34.205rows/schema/quyền so archive PASS; recovery shutdown | Không restore mới ở đợt này; production migration chưa làm |
| [Phase Y, phần tiếp tục cuối](archive/MVP_REAL_ESP32_END_TO_END_ACCEPTANCE.md) | CONNACK0,3telemetrybatches/12DBrows/API correlation;3fresh PERIODIC OFF, safetyfalse/false/testtrue/cap1, cleanup PASS | Browser launch failed; SOIL quality blocked; không live health hôm nay |
| [AS](archive/MVP_PHASE_AS_DASHBOARD_UI_ACCEPTANCE.md) / [AT](archive/MVP_PHASE_AT_FINAL_UI_ACCEPTANCE.md) | Dashboard có ảnh4values/API lỗi đã hết; AT có DeviceDetail/TEMPchart/operator thấy bảng | HISTORICAL_WEBSITE_UI_PARTIAL, thiếu full12rows/4charts/network và nhãn cuối |
| [AU](archive/MVP_PHASE_AU_HISTORICAL_UI_PRESENTATION.md) / [AV](archive/MVP_PHASE_AV_FINAL_UI_ACCEPTANCE.md) | AU labels/banner DEV-only; AV gặp presentation anchor drift thật | Không dùng AU offline làm browser PASS |
| [AW](archive/MVP_PHASE_AW_VITE_TRANSFORM_ORDER_REMEDIATION.md) | enforce:'pre' sửa confirmed Vite order; actual offline pipeline18/18, full320/320 PASS | Không real browser acceptance; manifest9 không phải approval |
| [AX](archive/MVP_PHASE_AX_FINAL_HISTORICAL_UI_ACCEPTANCE.md) / [AY](archive/MVP_PHASE_AY_NATIVE_COMPLETION_DIAGNOSIS.md) | AX wrapper native-1073741819, startup0/1; AY evidence insufficient | Hash JSON output không chứng minh exit0 |
| [AZ](archive/MVP_PHASE_AZ_EVENT1000_1001_METADATA.md) | Collector1/1 native0,4events; PowerShell1512/ntdll/c0000005 candidate | Không PID linkage chắc tới AX, không root cause confirmed |
| [12D4](archive/PHASE12D4_PHYSICAL_PUMP_ACCEPTANCE.md) | ACK APPLIED/SUCCESS và MAX_RUNTIME OFF; user thấy motor/tựdừng~1s | Toàn phiênPARTIAL:2ON, chưa nước/pulsewidth/full browser; không auto physical |

## Chạy trong đợt hoàn thiện này

Chỉ chọn tests có fake handles/classification, không gọi native diagnostic thực:

```powershell
node --test --test-name-pattern="chain classification|fake observer|actual native adapter|target timeout|missing independent|malformed observer" scripts/mvp-hash-diagnostic.test.cjs
```

**18/18 PASS,0fail,0cancel,0skip**, Node test runner và enclosing tool completion **exit0**, tool chunk `519c15`. Các case phân biệt child/outer/observer/tool failure, parent mismatch, thiếu PID/native exit, timeout và propagation; adapter tests dùng fake EventEmitter handles, không start target/PowerShell/DB/browser/network. Không chạy full AJ suite: suite đó còn expected rev4/manifest pin cũ và không được coi là compatible rev9 chỉ vì classifier pass.

Một invocation đọc package/source trong đợt này in dữ liệu rồi enclosing tool báo **-1073741819**, chunk `98187e`. Không chạy lại invocation đó để tái hiện, không query Event Log mới. Không có independent OS PID/module metadata của invocation này; không gán nó cho crash1512 hoặc Node/Prisma. Các reads khác hoàn tất exit0 không chứng minh native issue đã sửa vĩnh viễn.

Thay đổi mới chỉ README/tài liệu; không sửa application source, firmware, launcher hoặc manifest. Vì vậy không rerun320suite/typecheck/build/release/browser acceptance; trạng thái các checks đó là **NOT_RUN_THIS_SESSION**, không gán PASS mới. Kiểm tra8tài liệu: **73/73 local file links tồn tại**,13/13 completion status fields có mặt, enclosing native exit0 (chunk `e11db1`). Kiểm tra này không xác nhận nội dung website hoặc link anchors bằng browser.

## Native remediation review và gate

AX dùng inline tool-host PowerShell, gọi Node membership helper; không giữ handle/PID độc lập ở boundary lỗi. AK dùng file-based `-File` và Node direct script, handles riêng từng tầng; chain native0 thật nhưng invocation hậu kiểm khác lỗi, nên không sửa lịch sử AK thành fullPASS. AZ observer độc lập ghi PID/start/native exit thành công, có byte cap và finite timeout.

Không đủ chứng cứ quy inline/stdin hoặc ntdll là root cause. File-based transport giúp gắn source và process evidence, **chưa chứng minh chữa crash**. Không thay code theo suy đoán hoặc suppress nonzero.

Review nguồn tái sử dụng:

| Source | SHA256 đã đọc |
|---|---|
| scripts/mvp-hash-diagnostic-outer.ps1 | e973e0190d53521c6126984a5c81a8e8e496b135e8ca92a79f64360f8285b88e |
| scripts/mvp-hash-diagnostic-observer.cjs | b7c796ccec7395563ae4a5817de2d8b2d0a73a50ba6a657a5584f7f23895ee35 |
| scripts/mvp-ui-native-boundary.cjs | b2f6206df966fe0de10c8616e76ae17be6335244888356c9bbdb52cd9acfffd5 |

AJ policy/outer hardcode rev4 và manifest `b0c897...`; **không chạy nguyên AJ launcher trên rev9, không đổi pin để giả approval**. Ranh giới reusable là function held-handle và classifier; AZ `Observe-Collector` hỗ trợ bounded streams/OS start, nhưng main của AZ là event collector, không được gọi lại hoặc thay target theo approval cũ.

### Một diagnostic tối thiểu được chuẩn bị ở mức execution design

Chỉ đề xuất **một file-based hash-only native boundary diagnostic** với approval mới. Không thay thế bằng full preflight/startup:

1. Review/pin file wrapper/target riêng cho current manifest9; dùng lại held-handle function đã kiểm tra, không tạo supervisor framework. Không import backend/runtime app để tính membership; đọc source/manifest như dữ liệu. Kiểm tra membership250 và4binary pins đầy đủ, không bỏ identity/NTFS/listener gates của preflight sau này.
2. Process tree hữu hạn: independent observer → PowerShell `-NoProfile -NonInteractive -File <reviewed wrapper>` → Node `<reviewed hash-only file>`. Không `-Command` chứa executable source, không JSstdin, shell interpolation hoặc NODE_OPTIONS ngoài allowlist.
3. Observer giữ OS handles; từng tầng ghi PID/creator parent/OS StartTime/native ExitTime/ExitCode và stderr/stdout bytes vào create-new artifact. Không lấy stdout JSON làm nativePASS; OS parent/ownership không xác minh được thì UNKNOWN.
4. Private operator-owned run/attempt mới, empty isolated TEMP/TMP, closed env không credentials, source/binary hashes rechecked. Bound child25s/outer35s/observer45s, cap gộp64KiB tại mỗi tầng, không retry/fallback/kill unknown process. Timeout không đổi thành exit0; dispose owned handles/streams, giữ evidence.
5. Tối đa một execution, không DB connection/startup, API/frontend/browser/MQTT/EventLog mới hoặc hardware. Nếu failure, dừng; không tự sửa/hotpatch rồi retry.

**Chưa có executable bundle mới được pin/test cho toàn contract rev9**; đây là kế hoạch tối thiểu đã review, không phải READY launcher hoặc lệnh được phép chạy ngay. Preparation hiện tại dừng trước execution gate. Khi scope diagnostic được duyệt, phải hoàn tất final wrapper adaptation + synthetic checks + exact source pin review trước attempt; nếu không đủ thì không consume attempt. Không cần một phase infrastructure mới hoặc initdb để làm việc đó.

## Rollback và tiêu chí hoàn thành

Không thay runtime/data nên không có runtime rollback cần chạy. Doc diff có thể review/hoàn tác riêng từng hunk, giữ nguyên evidence/phase reports; không dùng git reset/clean trên workspace đang có thay đổi khác. Release final chỉ PASS sau native completion hợp lệ và một supervised UI acceptance đạt checklist. Overall hiện **NOT_READY_FOR_DEFENSE**.

# MQTT ACL patch proposal — PREPARE ONLY

Ngày: 29/10/2026, UTC+7. Phạm vi: đề xuất read ACL, không áp dụng.

> **Kết quả resume hiện hành:** operator đã nhập username cục bộ; helper dừng tại `SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED`. Không có candidate/diff. Xem kết quả cuối trong mục J. Nội dung chờ nhập/BLOCKED identity ban đầu bên dưới là lịch sử; không yêu cầu operator lặp lại metadata Administrator khi PID/start/hash vẫn khớp.

## A. Broker/config/ACL identity

Read-only preflight xác định LAN listener0.0.0.0/[::]:1883 thuộc **mosquitto.exe PID6636**. Loopback127.0.0.1/[::1]:1883 thuộc PID4572, là instance riêng. Không giả định hai instance cùng cấu hình.

| Artifact | SHA256 thực đọc, khớp pin người dùng |
|---|---|
| C:\mosquitto\config\mosquitto.conf |084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F|
| C:\mosquitto\config\acl |4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766|

ExecutablePath và CommandLine của PID6636 không khả dụng qua CIM dưới quyền terminal hiện tại; chưa đối chiếu trực tiếp executable/config argument với process hiện hành. Việc hash khớp chứng minh hai file trên đĩa khớp pin, chưa tự chứng minh cấu hình trong bộ nhớ hoặc thời điểm reload.

## B. Current permission assessment và giới hạn bằng chứng

Người dùng cung cấp audit baseline: subscriber section tồn tại, thiếu READ cho ba topic, không thấy DENY trong lần audit trước. Đây là evidence được cung cấp, **chưa được tái đánh giá theo account cụ thể trong phiên này**.

Username subscriber trước đó chỉ được nhập tại máy, không được lưu vào evidence. Agent không có danh tính này để chọn user block; không lấy từ firmware/.env/passwordfile, không đoán là tài khoản thiết bị hoặc backend.

**Preflight BLOCKED:** chưa xác minh executable/config argument và chưa xác định/đối chiếu username subscriber cục bộ. Theo điều kiện STOP của yêu cầu, không tiếp tục phân tích user blocks/global patterns/plugin hoặc tạo patch. READ của cả telemetry/status/actuator/state hiện là READ_PERMISSION_UNDETERMINED trong phiên chuẩn bị này.

RAW0/SUBACK thành công ở phiên trước chưa chứng minh tuyệt đối root cause ACL. Không kết luận MQTT_READ_FIXED hoặc ESP32_LIVE_E2E_ACCEPTED.

## C. Exact proposed diff

**NOT_CREATED.** Chưa có private staging artifact, unified diff hoặc ACL candidate. Không tạo diff có user block suy đoán hoặc placeholder rồi coi là patch đã sẵn sàng.

Phạm vi được người dùng cho phép sau khi xác minh đúng user block chỉ gồm:

```text
topic read smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry
topic read smart-agriculture/v1/devices/ESP32-GF-A-01/status
topic read smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
```

Đây là danh sách grant dự kiến, **không phải unified diff có thể apply**. Không WRITE/READWRITE/wildcard hoặc thay user khác. Phải bỏ grant thừa nếu quyền tương đương đã tồn tại, và dừng nếu có DENY xung đột.

- Original ACL hash: **4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766**.
- Candidate ACL hash: **NOT_AVAILABLE — chưa tạo candidate**.
- Patch path/hash: **NOT_AVAILABLE — chưa tạo patch**.
- Thay đổi ACL thực tế: **0 thêm / 0 sửa / 0 xóa**.
- Dòng dự kiến: tối đa3 grant, chỉ xác định chính xác sau permission assessment.

## D. Static validation

Hash config/ACL: **PASS**. Process executable/config-argument gate: **NOT_VERIFIED**. Subscriber identity gate: **NOT_VERIFIED**. Effective user/pattern/deny/plugin assessment: **NOT_PERFORMED sau STOP**. Candidate syntax/encoding/line-ending preservation: **NOT_VERIFIED**, vì chưa tạo candidate. Không chạy Mosquitto thử nghiệm hoặc mở subscriber để ép PASS.

Sau khi gate đạt, cần thao tác byte-preserving: nhận diện encoding/BOM/EOL, chèn đúng vị trí trong user block, giữ nguyên toàn bộ byte ngoài phần chèn; đối chiếu không thay block khác. Kiểm tra cú pháp bằng phân tích offline chỉ là static assurance; không đồng nhất với broker runtime parser hoặc live delivery.

## E. Impact and security review

Không có thay đổi quyền thực tế. Grant dự kiến chỉ mở khả năng quan sát ba topic cho account đã xác minh; không cấp publish/control. Cần xem toàn bộ user/global pattern và plugin để tránh đánh giá sai quyền hiệu lực. Diff chứa context username phải lưu private staging và chỉ báo cáo redacted; chưa xác minh staging mới nên không tự ghi ACL copy vào vị trí bất kỳ.

Không đọc passwordfile/hash/password/token; không lưu username vào báo cáo. Giữ SOIL_QUALITY_BLOCKED_ADC_AT_RAIL; đọc telemetry thành công trong tương lai cũng không cho phép tưới từ soil0% đang ADC4095.

## F. Application/rollback/reload plan — chưa thực hiện

Trong phiên áp dụng được phê duyệt riêng:

1. Revalidate listener/PID/executable/config, ACL hash, account và authorization mechanism. STOP khi drift.
2. Tạo backup ACL byte-for-byte tại nơi private được duyệt, ghi hash/ACL/owner; không sửa quyền thư mục cha.
3. Apply đúng candidate đã review, không overwrite account/password/rule khác; kiểm tra diff3grant/EOL/encoding/candidate hash.
4. Xác định cơ chế broker nạp lại ACL trên Windows từ executable/version và cách khởi động thực. **Chưa xác minh phương thức reload**; không hứa có SIGHUP hoặc zero-downtime. Nếu chỉ có restart phù hợp, phải xin phép rõ thao tác và đánh giá ESP32/subscriber reconnect trước khi thực hiện.
5. Phiên MQTT read-only mới cần phê duyệt đúng phạm vi, clientID riêng, non-retained/fresh/counters, không publish. Không dùng SUBACK làm bằng chứng READ đã sửa.
6. Nếu apply/reload có lỗi, dừng không retry tự động; rollback bằng backup chính xác theo phạm vi được duyệt, kiểm chứng hash và hiệu lực. Giữ mọi evidence lỗi.

Không backup/apply/reload/restart/rollback hoặc network test nào được thực hiện trong phiên này.

## G. Điều kiện cần hoàn tất và phê duyệt

Đã có phê duyệt PREPARE ONLY; không cần hỏi lại cùng phạm vi. Cần operator tự mở terminal Administrator để đọc metadata PID/config thực, và nhập/đối chiếu **username subscriber** cục bộ với tài khoản đã dùng. Không gửi username/password qua chat. Do username chưa được xác định tại gate hiện tại, đã STOP trước patch generation.

Sau khi các identity gate đạt, mới chuẩn bị private diff/candidate và hash, permission assessment trước/sau. Việc áp dụng, tạo backup ACL, reload/restart và phiên subscriber sau áp dụng đều cần phê duyệt riêng, chưa bao gồm ở đây.

## H. Final verdict

**MQTT_ACL_PATCH_PREPARATION_BLOCKED**

Không có patch áp dụng hoặc candidate hash để duyệt lúc này. Chỉ tạo báo cáo và cập nhật mục ngắn trong acceptance report; không sửa broker/runtime/credentials/firmware/database, không mở MQTT subscriber, không ON/OFF, không bật Commands/Automation hoặc cấp nguồn bơm.

Giữ **ESP32_LIVE_E2E_PARTIAL**, **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**, **SOIL_QUALITY_BLOCKED_ADC_AT_RAIL**. STOP.

## RESUME A–J — chuẩn bị offline, chưa áp dụng

### A. Current broker identity check

Đã đọc lại listener, Win32_Process.CreationDate và hashes. LAN vẫn PID6636/mosquitto.exe, startUTC **2026-10-29T13:59:34.8647260Z**, bind0.0.0.0/[::]:1883; loopback PID4572 riêng. Hash config084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F và ACL4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766 vẫn khớp pin.

Executable `C:\Program Files\mosquitto\mosquitto.exe` và config argument `C:\mosquitto\config\mosquitto.conf` kế thừa **operator Administrator attestation lịch sử** trong yêu cầu resume, không tuyên bố là fresh elevated inspection của agent. PID/start/hash không drift nên được tiếp tục PREPARE ONLY theo phạm vi mới; helper kiểm tra lại PID/start/hash ngay trước nhận handoff và trước xử lý candidate. Nếu drift sẽ STOP và yêu cầu duy nhất metadata process mới.

Config trên đĩa khai báo listener1883, allow_anonymousfalse, password_file (chỉ phát hiện directive, không mở file), acl_file C:/mosquitto/config/acl, log_types error/warning/notice. Không thấy include_dir/plugin/global_plugin/auth_plugin/plugin options trong config đã pin; không thấy per_listener_settings. Trên đĩa hiện có một listener cấu hình và ACL tĩnh. Config modifiedUTC2026-08-27T17:18:33Z, ACL modifiedUTC2026-10-16T12:18:26Z đều trước process start; điều này hỗ trợ provenance ban đầu nhưng **không chứng minh toàn bộ effective in-memory ACL/reload history**.

### B. Subscriber identity verification — redacted

Helper `scripts/mqtt-acl-prepare-local.ps1` chỉ hỏi username bằng prompt ẩn, không hỏi password. Operator phải xác nhận SAME SUBSCRIBER và khai báo DEDICATED hoặc SHARED. Đây là local operator attestation về account đã dùng, không phải so sánh với credential log cũ vốn không được giữ.

Username truyền qua anonymous stdin pipe vào child offline, không CLI/env/file/stdout/report/Git. Không tạo username handoff file, nên không có file handoff cần xóa. BSTR được ZeroFreeBSTR và biến được bỏ tham chiếu cuối phiên; không hứa xóa tuyệt đối mọi managed-memory copy. Candidate ACL nếu tạo sẽ chứa các user names vốn có, chỉ ở private staging và không được in ra tools/report.

Staging đã tạo và đọc lại: `C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\mqtt-acl-plan-20261029-234656-e202cf`. OwnerSIDoperator đã pin; protected DACL không kế thừa, đúng **một ACE operator FullControl**, không reparse; các ancestor được kiểm tra không reparse. Không sửa ACL thư mục cha hoặc broker. Chưa ghi candidate/patch/username. Cloud/backup scope vẫn NOT_VERIFIED; không lưu password/secret hoặc firmware trong staging này.

### C. Exact user block selection

**PENDING_LOCAL_INPUT.** Helper đối chiếu case-sensitive username với đúng một user block; zero/multiple blocks STOP. Không dùng clientID thay username, không đoán từ firmware/backend. Account SHARED/không xác nhận dedicated, username chính thiết bị hoặc có quyền write vào telemetry/status/state/command/ACK đã pin sẽ STOP với SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED, trước candidate. Cần quyết định account riêng khi đó; không tự tạo account hoặc thêm read cho account publisher/control.

### D. Existing permissions

ACL đã được đọc trong memory chỉ để đếm directives; không xuất user names/nội dung ACL. Có2user blocks,6topic rules,4global pattern rules. Quyền account cụ thể trước/sau chưa được tính khi chưa có local username. Parser sẽ xét topic của đúng user và patterns toàn cục, default readwrite, explicit read/write/readwrite/deny, MQTT +/#, %u=username, %c=clientID. DENY được ưu tiên; %c có thể ảnh hưởng mà chưa có clientID thì scope UNDETERMINED và STOP, không giả allow.

Các quy tắc username/pattern/deny được đối chiếu với [Mosquitto configuration manual](https://mosquitto.org/man/mosquitto-conf-5.html). Static analysis không thay runtime broker/parser/version verification.

### E. Candidate diff — redacted

**PENDING_LOCAL_INPUT, NOT_CREATED.** Nếu đạt mọi gate, helper chỉ thêm grant read còn thiếu cho đúng3topic; zero-context unified diff không chứa username hoặc nguyên ACL. Candidate nằm ngoài broker/repository. Encoding/BOM/EOL được nhận diện và roundtrip; giữ nguyên prefix/suffix bytes ngoài insertion. Mixed/unsupported encoding/EOL, unsupported ACL syntax hoặc insertion không có newline an toàn sẽ STOP thay vì normalize file.

### F. Candidate hash

**NOT_AVAILABLE** trước local input. Original ACL hash vẫn4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766. Helper chỉ ghi bằng create-new `acl.candidate`, `acl.patch`, `assessment.json` nếu đạt gate; không overwrite hoặc ghi broker. Nếu BLOCKED chỉ ghi assessment redacted và giữ staging.

### G. Offline validation

**11/11 synthetic tests PASS**, exit0, với `node --require ./scripts/acceptance-offline-guard.cjs --test scripts/mqtt-acl-prepare.test.cjs`. Bao gồm insertion3grant, không sửa user khác, wildcard grant tương đương tránh duplicate, global %u, %c ambiguity, DENY precedence, shared/control-capable account, zero/multipleuser, UTF8/UTF16LEBOM vàCRLF, malformed wildcard/unsupported syntax/mixedEOL. Lần test đầu10/11 do fixture duplicateuser trộnLF/CRLF, đã sửa riêng fixture và chạy lại11/11. Không suy live-delivery từ tests này.

Node syntax và PowerShell AST PASS. Cửa sổ helper đầu dừng trước tạo staging/nhập username vì Get-Item thiếu -Force ở ancestor ẩnAppData; đã sửa thao tác đọc và xác minh toàn bộ ancestors read-only, sau đó mở helper mới PID18680. Không có broker mutation hoặc credential handoff trong lần dừng đó.

SHA256 module **E74916456F0274D86BFCA23F3A50ABA485B5185D53A4523ADBA7AD604E52BE3B**; helper sau sửa **82A09997DDF0742C808842ED484953DBED4C84670F196BEA44F010015B5D496A**. Native Mosquitto candidate syntax/in-memory ACL/live delivery vẫn NOT_VERIFIED, không start broker thử nghiệm.

### H. Security impact

Không thay quyền thực tế. Candidate chỉ được phép bổ sung read3topic, không write/readwrite/wildcard mới, không sửa account khác/password. Parser và source helper tách biệt startup sản phẩm, không import MQTT/Prisma hoặc mở mạng. Mọi dữ liệu chứa username ở candidate/diff private; public report chỉ assessment redacted. Giữ soil ADC4095 blocker; không nâng VERIFIED_LIVE hoặc cho phép automation.

### I. Apply/reload/rollback proposal

Chưa có apply approval. Khi candidate hoàn chỉnh phải review diff/hash và least-privilege trước. Phiên áp dụng riêng cần revalidate process/start/config/ACL/candidate hash, backup byte-for-byte tại nơi private được duyệt, apply đúng insertion rồi so hash/byte diff, xác minh phương thức nạp ACL phù hợp Windows instance/version. Reload không được giả định tự có; nếu cần restart phải nêu gián đoạn publisher/subscriber và được duyệt trước. Rollback chỉ bằng backup chính xác theo approval; không destructive reset. Phiên subscriber kiểm chứng delivery mới cũng cần phạm vi được duyệt, không dùng SUBACK làm PASS.

### J. Current verdict

**KẾT QUẢ SAU LOCAL HANDOFF — thay thế trạng thái chờ nhập bên dưới:**

Assessment thực tế tại `C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\mqtt-acl-plan-20261029-235121-803ed9\assessment.json`:

```json
{
  "verdict": "MQTT_ACL_PATCH_PREPARATION_BLOCKED",
  "reason": "SHARED_OR_CONTROL_CAPABLE_ACCOUNT_DECISION_REQUIRED",
  "originalHash": "4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766",
  "usernamePersisted": false
}
```

Theo thứ tự gate trong module đã review, kết quả này cho biết username đã khớp chính xác **một user block**, parser đã đi qua đánh giá DENY/scope của ba topic mà không phát sinh gate DENY/%c ambiguity. Sau đó kiểm tra account usage thất bại, trước mọi thao tác ghi candidate. Username không được in, không lưu trong assessment hoặc file handoff.

**Giới hạn quan trọng:** reason hiện gộp các nhánh `dedicated=false`, username trùng identity thiết bị, hoặc có/không xác định được quyền write vào telemetry/status/state/commands/ACK target. Assessment không lưu nhánh cụ thể và username đã được bỏ tham chiếu; không đủ bằng chứng để kết luận chắc chắn operator đã chọn SHARED, tài khoản chính là publisher, hoặc có quyền điều khiển bơm. Không suy đoán nhánh để hợp thức hóa patch. Before/after read matrix không được persist khi gate dừng; không tự điền các quyền đó là ALLOWED/DENIED.

Đã kiểm tra staging sau phiên: chỉ có assessment236bytes, **không có acl.candidate hoặc acl.patch**. Assessment owner là operatorSID đã pin, không reparse, chỉ một ACE Allow/operator FullControl kế thừa từ staging private protected; không có principal rộng. Không có username handoff file để dọn, candidate không tồn tại nên không phụ thuộc handoff. Không xóa evidence hoặc staging cũ. Helper process đã kết thúc theo snapshot sau nhập; không có MQTT/backend/database do helper khởi động.

Rehash cuối: config và ACL vẫn đúng baseline trong mục A; **0 thay đổi broker ACL**. Candidate hash/patch path vẫn NOT_AVAILABLE. Chưa sửa quyền publish/read hoặc áp dụng ba dòng grant.

**Quyết định còn thiếu:** dùng một tài khoản observer riêng, không dùng chung ESP32 publisher hoặc control. Nếu đã có account chỉ đọc dành riêng, operator có thể chỉ định và nhập username cục bộ trong lần chuẩn bị tiếp theo; nếu chưa có, cần chuẩn bị/duyệt riêng việc tạo account và quyền read3topic, không tự thêm account/password trong phase này. Muốn tiếp tục dùng account chung cần người dùng quyết định rõ về least privilege trước khi mở rộng phạm vi; helper hiện không có bypass để tự cấp read cho account đó.

**Final: MQTT_ACL_PATCH_PREPARATION_BLOCKED.** Không cần làm lại process/hash gate đã đạt, không hỏi password/username qua chat. Không tự chạy lại helper, không tạo account, không apply/reload/restart hoặc mở subscriber. Giữ ESP32_LIVE_E2E_PARTIAL, AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED và SOIL_QUALITY_BLOCKED_ADC_AT_RAIL. STOP.

---

**Lịch sử trước khi nhận handoff:**

Operator đã yêu cầu nhập lại. Helper cũ PID18680 chỉ còn console host, chưa có child xử lý/candidate/assessment; agent đóng đúng prompt do mình mở và giữ nguyên staging cũ rỗng. Đã mở prompt mới PID7960 với private staging create-new `C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\mqtt-acl-plan-20261029-235121-803ed9`. Source hashes không đổi, không dùng lại username, không ghi đè evidence hoặc chạy MQTT. Prompt mới vẫn cần SAME SUBSCRIBER, username cục bộ và DEDICATED/SHARED trước khi phân tích.

**MQTT_ACL_PATCH_PREPARATION_BLOCKED — chờ local username và account-usage assessment.** Gate process/hash đã đạt theo operator historical attestation; không yêu cầu lặp lại gate đã PASS. Chưa có candidate nên chưa cấp expected hash/patch path cuối cùng. Helper đang chờ nhập tại máy, không hỏi username/password qua chat.

Không sửa/reload/restart broker, không đọc passwordfile, không mở subscriber hoặc publish, không startDEV/backend/database, không flash/reset/ON/OFF/pump power. Giữ ESP32_LIVE_E2E_PARTIAL, AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED, SOIL_QUALITY_BLOCKED_ADC_AT_RAIL. Sau handoff, cập nhật verdict theo assessment thực tế rồi STOP, không tự apply.

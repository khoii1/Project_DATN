# Dedicated MQTT observer account — PREPARE ONLY

Ngày: **30/10/2026, UTC+7**. Account đề xuất do người dùng chọn: `sa_mqtt_observer`. Chưa tạo account hoặc credentials.

> **Kết quả hiện hành sau phê duyệt 4DENY +3READ:** **MQTT_OBSERVER_ACCOUNT_PREPARED_NOT_APPLIED**. Candidate và diff đã tạo trong private staging; original/candidate hashes và validation tại mục J. Các mục A–I giữ lịch sử thiết kế trước phê duyệt; trạng thái collision NOT_VERIFIED/BLOCKED tại đó đã được thay thế bởi kết quả mục J. Không tạo credential, apply, reload, restart hoặc live subscriber.

## A. Broker/config identity

Current read-only check: LAN **PID6636**, process name mosquitto.exe, CreationTimeUTC **2026-10-29T13:59:34.8647260Z**, bind0.0.0.0/[::]:1883. Loopback PID4572 bind127.0.0.1/[::1]:1883 riêng, không thay đổi.

Executable `C:\Program Files\mosquitto\mosquitto.exe` và config argument `C:\mosquitto\config\mosquitto.conf` kế thừa operator Administrator attestation lịch sử, đối chiếu PID/start hiện tại không drift. Không tuyên bố agent vừa thực hiện elevated process inspection.

| File trên đĩa | SHA256 hiện tại |
|---|---|
| C:\mosquitto\config\mosquitto.conf |084DFBFCF4DF6A7C30A4C3AFD0CE91DE31749FF9D572E361E7234EBA6F598F6F|
| C:\mosquitto\config\acl |4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766|

Config đã pin dùng listener1883, allow_anonymousfalse, password_file và acl_file tĩnh, không có include/plugin được khai báo. Hash khớp không thay bằng chứng effective in-memory ACL/reload history; chưa có live delivery verification.

Binary trên đĩa chạy riêng **chỉ `-h`**: mosquitto version **2.1.2**, help exit0; password utility help exit1, liệt kê argon2id/sha512-pbkdf2, defaultargon2id. Đây là help-only child đã kết thúc, không start listener hoặc thay broker đang chạy. Không tự đồng nhất binary trên đĩa với hash image đang resident trong PID.

Broker binary SHA256 **DAA688DBC3685890999084DA72F98EA0FAE9557F7544A2CB96B44EF46563F2A2**. Password utility SHA256 **9AADA8D15840313A99343423BFE831519E35FD0BC229FA0B8907DCE3F96858A7**. FileVersion/ProductVersion resources không có giá trị; version lấy từ help, không suy từ tài nguyên rỗng.

## B. Existing account inventory — redacted

- ACL có **2 existing user blocks**; không xuất tên.
- `sa_mqtt_observer` có **0 user blocks** trong ACL hiện tại.
- Cả2 existing blocks đều có ít nhất một concrete global-pattern WRITE witness được static evaluator cho phép. **Không tìm thấy account trong ACL vừa đáp ứng3READ vừa không có write witness**. Không khẳng định đã kiểm kê mọi credential login không có ACL user block.
- `sa_mqtt_observer` có tồn tại trong password_file hay không: **NOT_VERIFIED**. Khi chứng minh global WRITE blocker, đã tuân thủ STOP, không mở password_file/đọc hash để hoàn tất collision check không còn cần cho candidate hiện tại. Trước bất kỳ create/reuse nào vẫn phải kiểm tra username-prefix membership bằng phương thức không thu thập/hiển thị trường hash; không coi absence trong ACL là absence trong password_file.
- Không giữ username handoff cũ hoặc đoán account từ firmware/backend. Tên mới là public proposed identifier do người dùng chọn, chưa phải credential hoạt động.

## C. New Observer decision — blocker đã xác định

Chọn observer riêng là hợp lý nhưng **thêm một user block chỉ gồm3READ không tạo ra tài khoản read-only** trên ACL này.

Source chính xác trong `C:\mosquitto\config\acl`:

```text
line 10: pattern write smart-agriculture/v1/devices/%u/telemetry
line 11: pattern write smart-agriculture/v1/devices/%u/status
line 12: pattern read smart-agriculture/v1/devices/%u/commands/+
line 13: pattern write smart-agriculture/v1/devices/%u/command-acks/+
```

Pattern áp dụng toàn cục kể cả khi nằm sau user block; %u là MQTT username, %c là client ID. Vì vậy account mới thừa hưởng WRITE trong namespace `sa_mqtt_observer` và READ commands trong cùng namespace. Đây là **static permission finding**, không phải chứng minh nguyên nhân RAW0 của phiên trước hoặc live authorization test. [Mosquitto ACL reference](https://mosquitto.org/man/mosquitto-conf-5.html).

Không có global DENY ngăn ba WRITE witnesses được kiểm tra; proposed account chưa có user block riêng. Không thấy %c trong4global patterns. Account mới không được quyền publish commandPUMP_01 của ESP32 thật theo static rules đã đọc; **không đánh đồng WRITE telemetry/ACK trong namespace riêng với quyền bật bơm thật**.

**STOP theo mục3 của yêu cầu:** global pattern cấp WRITE nên chưa tạo candidate hoặc account. Không âm thầm sửa pattern chung hoặc đổi quyền existing ESP32.

## D. Authentication change plan — chưa thực hiện

Chỉ sau khi thiết kế read-only được chấp thuận và password-file collision check hoàn tất:

1. Revalidate actual config/password_file path và broker/utility identity/version; không đọc password hashes vào evidence.
2. Nếu username đã tồn tại, STOP để đánh giá reuse; không tự overwrite password.
3. Trong phiên APPLY được duyệt riêng, bảo vệ và backup password_file cùng ACL; backup chứa hashes là sensitive, cần private ACL và không đưa Git/log/report.
4. Dùng utility interactive để thêm username, operator tự chọn mật khẩu tại máy. Không `-c`, `-b`, `-U`; không password quaCLI/chat/env/fileplaintext. Không chạy utility tạo credential trong PREPARE.
5. Help utility hiện cho phép `-H argon2id` hoặc `-H sha512-pbkdf2`. Đề xuất pin rõ thuật toán hỗ trợ bởi đúng broker2.1.2 thay vì phụ thuộc default của tài liệu phiên bản khác. Xác minh identity version trong phiên APPLY trước khi chọn; hiện **chưa tạo hash thật hoặc chứng minh authentication runtime**.

Thao tác interactive cập nhật user trong password_file có thể rewrite nội dung file theo utility, nên backup/so sánh các entry khác qua phương thức private không xuất hash là bắt buộc. Không hứa cập nhật zero-downtime. Các cờ và rủi ro overwrite/batch/upgrade được đối chiếu [mosquitto_passwd manual](https://mosquitto.org/man/mosquitto_passwd-1.html).

## E. ACL candidate/diff/hash

**NOT_CREATED** do global-WRITE gate thất bại. Không tạo staging/candidate/patch mới, không áp dụng block4dòng giả định chỉ-read.

- Original ACL hash: **4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766**.
- Candidate hash / patch path: **NOT_AVAILABLE**.
- Live changes: **0 thêm / 0 sửa / 0 xóa**.

### Phương án khắc phục tối thiểu để review, ngoài candidate được phép hiện tại

Giữ nguyên mọi existing rule, thêm **DENY chỉ trong block của observer mới** để triệt đúng bốn global patterns trong namespace riêng, rồi thêm3READ namespace thiết bị thật. Ý tưởng deny:

```text
topic deny smart-agriculture/v1/devices/sa_mqtt_observer/telemetry
topic deny smart-agriculture/v1/devices/sa_mqtt_observer/status
topic deny smart-agriculture/v1/devices/sa_mqtt_observer/command-acks/+
topic deny smart-agriculture/v1/devices/sa_mqtt_observer/commands/+
```

Đây **chỉ là đề xuất**, chưa candidate hoặc diff được nghiệm thu. Cần người dùng duyệt thiết kế bổ sung4DENY (hai dấu+ chỉ thu hẹp đúng namespace observer, không grant wildcard), vì scope hiện tại yêu cầu STOP khi global pattern gâyWRITE và chỉ mô tả block3READ. Không dùng#; không sửa quyền publisher/user khác.

Nếu được chọn cho lần chuẩn bị tiếp theo: test deny precedence và đầy đủ ACL, collision check, sau đó candidate gồm user mới+4DENY+3READ, byte-preserving encoding/BOM/EOL, diff/hash/privateACL/create-new, không thay byte existing users. Phải kiểm tra mọi other READ/WRITE ngoài3topic bị chặn; không chỉ kiểm tra3grant mới. Alternative tách global patterns thành user-scoped publisher rules tác động phạm vi lớn hơn và không được đề xuất làm đường mặc định.

## F. Read/write permission matrix — static, account chưa được tạo

| Topic / permission | ACL hiện tại với username đề xuất | Nếu chỉ thêm3READ |
|---|---|---|
|ESP32-GF-A-01/telemetry READ|NOT_GRANTED|ALLOWED|
|ESP32-GF-A-01/status READ|NOT_GRANTED|ALLOWED|
|ESP32-GF-A-01/actuator/state READ|NOT_GRANTED|ALLOWED|
|sa_mqtt_observer/telemetry WRITE|ALLOWED bởi line10|Vẫn ALLOWED — vi phạm read-only|
|sa_mqtt_observer/status WRITE|ALLOWED bởi line11|Vẫn ALLOWED — vi phạm read-only|
|sa_mqtt_observer/command-acks/PUMP_01 WRITE|ALLOWED bởi line13|Vẫn ALLOWED — vi phạm read-only|
|sa_mqtt_observer/commands/PUMP_01 READ|ALLOWED bởi line12|Vẫn ALLOWED — ngoài3READ mục tiêu|
|ESP32-GF-A-01/commands/PUMP_01 WRITE|NOT_GRANTED|NOT_GRANTED|

Các topic rút gọn đều có prefix `smart-agriculture/v1/devices/`. NOT_GRANTED là kết quả static ACL cho username, không khẳng định CONNECT được vì password-file membership chưa xác minh. Không kiểm thử publish hoặc command để chứng minh deny.

## G. Security impact và offline tests

Thêm3READ mà không triệt quyền global sẽ tạo false assurance về observerread-only. GlobalWRITE witness là blocker đã chứng minh từ file, không chỉ nghi ngờ từ raw0. Không cần thay firmware/wire schema để xử lý blocker này.

Thêm `scripts/mqtt-observer-assessment.cjs` và `.test.cjs`, chỉ pure offline logic, không filesystem/passwordfile/MQTT trên import. Chạy thực tế **15/15 PASS** (4 observer tests +11 regression ACL tests), exit0, với offline network guard:

```text
node --require ./scripts/acceptance-offline-guard.cjs --test scripts/mqtt-observer-assessment.test.cjs scripts/mqtt-acl-prepare.test.cjs
```

Test chứng minh: newusername kế thừa globalWRITE dù chưa có block;3READ không loại WRITE; synthetic user-specific DENY chặn namespaceobserver nhưng không đổi write của synthetic publisher; khi không có globalWRITE thì3READ không tự cấp publish. Đây là synthetic static evaluator, **không native broker syntax hoặc live test**. Cú pháp static dựa trên subset được parser hỗ trợ; không coi testDENY với# trong fixture là patch được đề xuất (# không có trong phương án4DENY nêu trên).

Actual ACL được parse trong memory, xuất duy nhất proposed-account permission witnesses và số lượng existing users; không xuất username hiện hữu. Một lệnh assessment ban đầu bị PowerShell làm mất quote của `node -e`, SyntaxError trước khi đọc file; đã chạy lại đúng bằng stdin code, không có broker operation. Không có credentials thật hoặc hashpassword trong tool output.

Soil ADC4095 vẫn **SOIL_QUALITY_BLOCKED_ADC_AT_RAIL**; telemetryREAD trong tương lai không đồng nghĩa automationready. Không nâng trust VERIFIED_LIVE.

## H. Apply/reload/rollback plan — chưa thực hiện

Sau approval thiết kế và candidate riêng, phiên APPLY phải:

1. Revalidate PID/start/actual executable/config/auth mechanism và hashes; STOP khi drift.
2. Backup ACL và password_file vào private location được duyệt, pinhash/owner/ACL, không xuất hashpassword.
3. Membership collision check, thêm user bằng promptpassword tại máy đúng một lượt; giữ credential existing users.
4. Apply candidate đúng hash và byte-preservation; không sửa config chung.
5. Xác định chính xác reload trên Windows2.1.2 và startup method. **Chưa xác minh native Windows reload mechanism**; không giả định LinuxSIGHUP dùng được hoặc mượn service loopback để restart LAN process. Nếu cần restart, phải được duyệt rõ đúng LAN instance và tác động reconnect.
6. Quan sát ESP32, sau đó phiên subscriberread-only mới dùng account observer được duyệt. Connect/3SUBACK/raw>0/3freshbatch×4readings/metadataQoS1/nonretained/freshOFF. Không startDEV trong phase này.
7. Quyền no-publish chứng minh bằng full static assessment/native isolated negative-test được duyệt riêng; không gửi ON/OFF hoặc fake ESP32 packet để thử production.
8. Nếu lỗi, STOP không auto-retry; rollback ACL/password_file từ backup chính xác theo phạm vi duyệt, đánh giá runtime reload/restart trước khi thực hiện. Không xóa evidence hoặc thay existing passwords.

## I. Approval requirements và verdict

**MQTT_OBSERVER_ACCOUNT_PREPARATION_BLOCKED**.

Đã tìm blocker cụ thể: **GLOBAL_PATTERN_GRANTS_WRITE_TO_PROPOSED_OBSERVER**. Cần quyết định thiết kế chặn quyền kế thừa của observer, ưu tiên4DENY scoped chỉ account mới +3READ; sau đó mới hoàn tất password-file collision check và candidate preparation. Việc tạo account/password, backup sensitivefiles, applyACL, reload/restart và live observer vẫn cần phê duyệt APPLY riêng; quyết định tên account hiện tại không phải approval các thao tác này.

Không sửa ACL/password_file/config, không tạo user/password, không restart/reload/stop broker đang chạy; không MQTTconnect/publish, không DEV/database/backend/frontend, không flash/reset/ON/OFF hoặc cấp nguồn bơm. Runtime flags/PENDING không được truy vấn trong phase này; không tuyên bố runtime đã xác minh. Giữ **ESP32_LIVE_E2E_PARTIAL**, **AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED**. STOP.

## J. APPROVED CANDIDATE PREPARATION — kết quả hiện hành

### 1. Identity, drift và collision

Đã đọc lại trước và sau tạo candidate: LAN PID6636/startUTC2026-10-29T13:59:34.8647260Z và listeners0.0.0.0/[::]:1883 không đổi; loopbackPID4572 giữ nguyên. Config/ACL hashes vẫn đúng pin mục A. Executable/config argument dựa trên operator attestation lịch sử có cùng PID/start, không giả fresh elevated inspection. Global4patterns được so sánh chính xác với expected access/filter, không chấp nhận extra globalallow hoặc %c scope không rõ. Không plugin/include drift trong config đã pin.

**Password-file collision check PASS:** chỉ thu username prefix trước dấu colon; byte trường hash được bỏ qua mà không decode/tích lũy/hash/log/export. File mở O_RDONLY, kiểm tra inode/size/mtime trước/sau scanner để phát hiện replacement/change. Chỉ xuất kết quả aggregate:2entries, `sa_mqtt_observer` occurrences0; không tên account khác hoặc password hash. ACL user block mới occurrences0. Không tạo hoặc ghi đè credentials; nếu collision thì module phải STOP trước write.

### 2. Private artifacts và hashes

Staging: `C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\mqtt-observer-candidate-20261030-003548-58ebd4`

| Artifact | SHA256 / trạng thái |
|---|---|
| Original live ACL | **4A18580727297602943818714405A4437B24BEA1905274E32A19EE8C0BF5E766** |
| acl.candidate | **8B779E9BFAFADF6B1A65331373DFE62C60EBB08B89847CB819E5383EAB94FEFC** |
| acl.patch | **B1D193EE3C14D65028CAE1E8AEF0A2A15F41057B144CBBEADE2D3CBBE920EB04** |
| assessment.json | Redacted matrix, language proof, collision counts, timestamp; không credential |
| native-checks.json / native-*.log | Native config-only validation và negative-control evidence; private |

Candidate chứa ACL gốc nên không in hoặc đưa Git; diff zero-context chỉ chứa tên observer mới đã được người dùng chọn công khai, không username existing users. DACL của staging protected, không kế thừa, một ACEoperatorFullControl; owneroperatorSID đã pin. Đã đọc lại owner/ACL/reparse của **mọi file**: chỉ operatorFullControl, file kế thừa từ protected staging, không reparse. Không sửa ACL parent/broker/production. Cloud/backup scope không được nâng VERIFIED.

### 3. Exact minimal diff và byte preservation

```diff
--- acl.original
+++ acl.candidate
@@ -1,0 +2,8 @@
+user sa_mqtt_observer
+topic deny smart-agriculture/v1/devices/sa_mqtt_observer/telemetry
+topic deny smart-agriculture/v1/devices/sa_mqtt_observer/status
+topic deny smart-agriculture/v1/devices/sa_mqtt_observer/command-acks/+
+topic deny smart-agriculture/v1/devices/sa_mqtt_observer/commands/+
+topic read smart-agriculture/v1/devices/ESP32-GF-A-01/telemetry
+topic read smart-agriculture/v1/devices/ESP32-GF-A-01/status
+topic read smart-agriculture/v1/devices/ESP32-GF-A-01/actuator/state
```

**8 thêm /0 sửa /0 xóa**. UTF8, BOM0, EOL LF giữ nguyên. ACL gốc không có newline cuối file: lần dựng đầu dừng trước write candidate; giữ staging rỗng `mqtt-observer-candidate-20261030-003438-1ae657`, không xóa/overwrite. Thay vì normalize EOF, candidate hiện hành chèn block tại byteoffset84 trước user block đầu tiên. Xóa đúng insertion khỏi candidate thu lại **toàn bộ original bytes giống hệt**, cả EOF không newline. Không đổi comments/rules/user blocks gốc. Insertion được kiểm tra không thay anonymous scope; user cũ bắt đầu bằng own user directive nên giữ scope như trước.

### 4. Complete static permission analysis — không chỉ sample topics

Tập rule áp dụng observer được kiểm tra đóng: đúng4globalpatterns đã pin, đúng4localDENY và3localREAD; không có localwrite/readwrite/extra grant. Sau thay%u, mỗi globalallow language trùng **toàn bộ** một deny language:telemetry,status,command-acks/+,commands/+. Với DENY precedence, mọi WRITE language kế thừa bị loại, kể cả mọi giá trị của wildcard+, không chỉPUMP_01. Ba READ exact ở namespaceESP32 khác namespaceobserver, không bịDENY. Suy ra:

- Surviving WRITE languages: **0** trên mọi topic trong supported static ACL model.
- Surviving READ languages: **đúng3 singleton topics** của ESP32.
- READ command namespaceobserver bị DENIED; command namespaceESP32 thật không được grant.
- Tập applicable rule(kind/access/filter) trước/sau cho **cả2 existing users và anonymous** giống hệt, nên ma trận quyền của họ bằng nhau trên mọi topic, không chỉ sample.

Đây là chứng minh trên đúng ACL tĩnh đã pin và semantics chuẩn; không phải runtime broker/plugin verification. DENY precedence được mô tả trong [Mosquitto ACL reference](https://mosquitto.org/man/mosquitto-conf-5.html).

| Phạm vi, cùng prefixsmart-agriculture/v1/devices/ | Trước candidate | Sau candidate, READ / WRITE |
|---|---|---|
|ESP32-GF-A-01/{telemetry,status,actuator/state}|Không grantREAD/WRITE|ALLOWED / NOT_GRANTED|
|sa_mqtt_observer/{telemetry,status}|WRITEALLOWED từglobal|DENIED / DENIED|
|sa_mqtt_observer/command-acks/+|WRITEALLOWED từglobal|DENIED / DENIED|
|sa_mqtt_observer/commands/+|READALLOWED từglobal|DENIED / DENIED|
|ESP32-GF-A-01/commands/PUMP_01 hoặc mãkhác|Không grant|NOT_GRANTED / NOT_GRANTED|
|ESP32-GF-A-01/command-acks/PUMP_01|Không grant|NOT_GRANTED / NOT_GRANTED|
|Namespace khác / $SYS / topicdeep ngoài language|Không grant|NOT_GRANTED / NOT_GRANTED|
|2 existing users và anonymous|Applicable rules gốc|Giữ nguyên toàn bộ read/write/deny languages|

Sample matrix trongassessment còn bao gồm wildcard valueOTHER, empty level, deeperlevel, namespacekhác và$SYS. Không dùng sample matrix thay whole-language proof ở trên.

### 5. Offline tests và native validation

**25/25 offline tests PASS**, exit0:10candidate/scanner/byteproof tests +4observer-assessment tests +11existingACLregression. Chạy:

```text
node --require ./scripts/acceptance-offline-guard.cjs --test scripts/mqtt-observer-candidate.test.cjs scripts/mqtt-observer-assessment.test.cjs scripts/mqtt-acl-prepare.test.cjs
```

Tests có collision, toàn wildcard deny coverage, nootherWRITE, legacy/anonymous scope unchanged, UTF8/UTF16LEBOM/EOL, missingEOFnewline, exact8lines, password-prefix scanner không phản chiếu hash/otherusername. PowerShell AST PASS. Không dùng synthetic để xác nhận live authorization.

Mosquitto2.1.2 help xác nhận `--test-config`; [official manual](https://mosquitto.org/man/mosquitto-8.html) mô tả chế độ không khởi động broker. Đã chạy trong private staging với config riêng chỉ trỏ candidate, khôngpasswordfile/plugin/persistence, không dùng configlive:

| Native check | Exit code | Diễn giải |
|---|---:|---|
| -h |0|Có quảng bá --test-config|
| --test-config với candidate-check.conf |0|Config syntax PASS|
| --test-config với config trỏ INVALID_ACL_DIRECTIVE_SYNTHETIC |0|Negative ACL control không bị bắt; mode này chưa chứng minh load/parseACL|

**NATIVE_ACL_SYNTAX_NOT_VERIFIED**, không nâng configPASS thành ACLparserPASS. Không thử startup thật để ép validation. Không mở listener hoặc liveMQTT; cả native child đã kết thúc, LAN/loopback PID sau kiểm tra giữ nguyên.

### 6. Source changes và security review

Thêm3file offline: `scripts/mqtt-observer-candidate.cjs`, `.test.cjs`, `scripts/mqtt-observer-stage.ps1`. Module SHA256 **ED4133503605FB9782253F7D46AB9272D2BD4739212735460867264F868D319C**; stage helper **F9967179D4D021EF3FAEE65D0D0B07B23881CFD3BA7610A86456D667AE641646**. Không nối vào startup sản phẩm. Node runner chỉ write vào private empty staging create-new; liveconfig/ACL/passwordfile chỉ mở đọc. Không dùng credentials từ.env hoặc firmware.

### 7. Authentication / apply / reload / rollback — chỉ runbook

User mới và password chưa tồn tại sau PREPARE. Phiên APPLY riêng cần: revalidate identity/hashes/collision, backup ACL/passwordfile private với approval rõ, operator nhập password tại promptmosquitto_passwd (không-c/-b/-U), pin thuật toán tương thích2.1.2, cập nhật đúngusername mới, kiểm chứng existing credential entries không bị thay bằng phương thức không xuất hash. Apply đúng candidatehash trên, không động user khác hoặc config.

Phương thức reload Windows của đúng LANinstance **vẫn cần xác minh trước khi tác động**; --test-config không reloadliveACL. Không giả định service loopback là LANservice hoặc dùng Linuxsignal. Nếu cần controlledrestart phải được duyệt riêng với phương án ESP32reconnect. Rollback chỉ dùng backups chính xác theo phạm vi duyệt, không đổi passwordexisting hoặc resetbroker. Không auto-retry khioutcomeunknown.

Sauapply, phiênread-onlyobserver riêng mới kiểmCONNECT/rawdelivery/3freshbatch×4sensors vàOFFmetadata; không gửiON/OFF hoặc publish để testdeny. Authorizationnegative test nếu cần phải có thiết kế cô lập riêng. Chưa startDEV/DB/API/UI hoặc nghiệm thuE2E.

### 8. Final verdict và điểm dừng

**MQTT_OBSERVER_ACCOUNT_PREPARED_NOT_APPLIED**.

- StaticACLanalysis: **PASS**, trên toàn bộ relevant rule languages của fileđãpin.
- Offline tests: **25/25PASS**.
- Native configsyntax: **PASS**; nativeACLsyntax: **NOT_VERIFIED**.
- Runtime broker authorization / live delivery: **NOT_VERIFIED**.
- Account/password creation, liveACLapply, reload/restart, subscriber, publish: **NOT_PERFORMED**.

Không tuyên bố MQTT_READ_FIXED hoặc ESP32_LIVE_E2E_ACCEPTED. Giữ ESP32_LIVE_E2E_PARTIAL, AUTO_IRRIGATION_PHYSICAL_NOT_EXECUTED, SOIL_QUALITY_BLOCKED_ADC_AT_RAIL. Không tác động backend/database/firmware/pump hoặc bậtAutomation. **STOP chờ phê duyệt APPLY riêng; không tự thực hiện.**

# Phase 13.4H — Secure credential rotation preparation

Ngày 21/10/2026, UTC+7. Đã đọc đầy đủ báo cáo 13.4G và 13.4F.1 trước kiểm tra. **Chỉ chuẩn bị offline: không đổi credentials, compile/flash, mở COM, reset hoặc restart dịch vụ.**

```text
CREDENTIAL_ROTATION_PLAN_PARTIAL
CREDENTIAL_ROTATION_NOT_PERFORMED
NEW_CREDENTIALS_NOT_PROVIDED_LOCALLY
NEW_FIRMWARE_BUILD_NOT_PERFORMED
FIRMWARE_FLASH_NOT_PERFORMED
AUTOMATION_ACTIVE=false (required invariant; last verified in Phase13.4G)
PHYSICAL_PUMP_NOT_TRIGGERED
VERIFIED_LIVE_NOT_READY
```

Runbook/checklist đã chuẩn bị. Chưa được chuyển sang execution: cần xác minh executable/config/quyền điều khiển đúng broker LAN, harden staging và nhập secrets mới cục bộ. Không dùng PLAN_READY để bỏ qua các gate này. Không coi việc chưa có mật khẩu mới là rotation đã thất bại; rotation **chưa thực hiện**.

## 1. Credentials affected và inventory

| Credential/container | Phạm vi và kết luận |
| --- | --- |
|Wi-Fi password của ESP32|**Confirmed exposed** trong tool-output13.4F.1; cần rotate. Người dùng xác nhận mạng là **hotspot điện thoại do mình quản lý**, có quyền đổi mật khẩu. Không suy đoán hệ điều hành điện thoại.|
|MQTT device password, username ESP32-GF-A-01|**Confirmed exposed**, cần rotate riêng; giữ username/namespace.|
|MQTT backend password|Khác hai password đã lộ, không có bằng chứng trực tiếp bị lộ trong sự cố config firmware. Không tự rotate ngoài approval riêng; không bảo đảm chưa lộ qua mọi kênh.|
|`firmware/SmartAgricultureESP32/config.local.h`|Wi-Fi và device MQTT secret dạng plaintext, GPIO/calibration/config vận hành. Không sửa file đang dùng trong phase này.|
|`backend/.env`|Backend MQTT secret, database/JWT và cấu hình khác; chỉ MQTT backend được đối chiếu trong bộ nhớ, không in nội dung/env/token. Không tự mở rộng incident thành việc đã lộ tất cả secrets ở đây.|
|`C:/mosquitto/config/passwords`|Password hashes của các principal; **không đọc/in/hash nội dung passwordfile trong task này**. Cần backup bảo vệ và cập nhật đúng một account sau approval.|
|`C:/mosquitto/config/acl`, `mosquitto.conf`|Chứa principal/topic/path, không phải nơi cấp password plaintext; không tự đổi ACL/config.|
|`build/*/sketch/config.local.h`, rollback staging|Có các bản sao secrets cũ/current.8 header/staging files khớp ít nhất một literal secret hiện tại khi quét trong bộ nhớ. Không xóa bằng chứng.|
|Application binary/ELF/object và output compile|Binary13.4F.1 kiểm tra trong bộ nhớ có cả Wi-Fi/device password; không công bố binary. ELF/object có thể chứa literal/debug data, phải xử lý như secret-bearing artifact dù không quét hết từng file.|
|`C:/DATN/backups/phase12d2b-before-upload-20261018-140955`|Backup source/config lịch sử đã có; credential set có thể khác hiện tại, vẫn nhạy cảm. Không mặc định rollback mạng cũ hoạt động sau rotation.|
|Tool-output13.4F.1 và bản export/cache liên quan|Phơi lộ đã biết; không đọc lại vào chat, không xóa log để che incident. Không xác minh được toàn bộ bản copy/cloud/export ngoài workspace.|

### Quét offline và Git

`build/phase13-4h-offline-inventory.cjs` chỉ đọc file và gọi Git local, không kết nối API/DB/MQTT. Kết quả `report/phase13_4h/offline-inventory.json`:

- 269 tracked files: không có candidate literal các password hiện tại theo scanner.
- 71 docs/report text files: không có candidate literal.
- 139 build text files:8 header/staging files có literal phù hợp, là các credential containers nêu trên.
- Không có commit tìm thấy ở **hai path hiện tại** `backend/.env` và `firmware/.../config.local.h` qua `git log --all -- <paths>`.

Scanner kiểm tra literal có quote/password assignment, bỏ file quá20MB và không quét toàn bộ remote/history/binary/encoding. Không có match **không chứng minh chưa từng lộ**. Không gọi secret-handling PASS cho sự cố cũ. Không rewrite Git history, xóa file hoặc dọn log.

Lượt inventory đầu đã xuất JSON nhưng process kết thúc native0xC0000005 sau output; nguyên nhân host chưa xác minh. Đã chạy lại đúng diagnostic offline, native exit0 và đọc/validate JSON thành công. Không thay Node/Prisma/toolchain để che lỗi. `build/phase13-4h-inventory-run.log` chỉ ghi kết quả đã lọc, không secrets.

## 2. Gitignore và NTFS — finding cần xử lý

`git check-ignore` xác nhận `.env`, đúng tên `config.local.h`, toàn bộ `build/`, `*.log` đang được ignore. Các path hiện tại chứa secrets không tracked. Nhưng:

- `report/*.json` không tự bị ignore: chỉ được đặt evidence đã lọc ở đây.
- Tên giả định `infrastructure/mosquitto/passwords`, `passwords.new`, `firmware/.../config.rotation.local.h` **không được pattern hiện tại chặn**. Không tạo secrets dưới những tên này trong repo. README Mosquitto có lệnh `-c` cho **khởi tạo lần đầu**, không dùng lại để rotation file hiện hữu.
- Gitignore không phải access control, không bảo vệ ZIP/upload, force-add hoặc file đã từng tracked. Chưa sửa `.gitignore`; nếu sau này muốn thêm quy tắc phải review riêng, ưu tiên staging ngoài repo.

`Get-Acl` chỉ đọc, `report/phase13_4h/acl-review.json`:

| Target | Finding |
| --- | --- |
|Repo/build/config.local.h/backend.env/C:/DATN/backups|Inheritance còn bật; BUILTIN Users có ReadAndExecute và Authenticated Users có Modify; không có deny rule trong các target kiểm tra. **Không đủ kín để nhập secrets mới**.|
|C:/mosquitto/config|Parent cũng có quyền đọc/sửa rộng; cần review khả năng thay thế/tamper file và quyền truy cập toàn bộ chuỗi thư mục.|
|C:/mosquitto/config/passwords|DACL protected, hiện chỉ account vận hành có explicitFullControl; tốt hơn parent nhưng chưa kiểm tra quyền thực tế của broker identity/khả năng thay file qua parent. Không nới quyền thành Everyone/Users để chạy broker.|

Không thực hiện thử truy cập dưới user khác, thay ownership/DACL, di chuyển hoặc xóa artifact. Các finding là rủi ro quyền local, **không phải chứng minh đã có người khác đọc secrets**.

## 3. Protected staging và nhập cục bộ — kế hoạch, chưa tạo

Đề xuất root riêng ngoài repo: `%LOCALAPPDATA%/SmartAgriculture/credential-rotation/<rotation-id>/`. Không dùng `C:/DATN/backups` hoặc `build/` hiện tại như thư mục đã được bảo vệ sẵn.

Trước khi nhập dữ liệu thật, cần approval riêng cho:

1. Tạo root/staging mới; xác minh absolute path, không reparse/symlink, không workspace root hoặc thư mục dùng chung.
2. Thiết kế NTFS least privilege: account vận hành cóRead/Write, SYSTEM/Admin theo nhu cầu vận hành/break-glass; không Users/AuthenticatedUsers/Everyone. Chỉ cấp broker runtime identity quyền cần thiết trên file deploy, không cho broker đọc mọi source/backup. Kiểm tra inheritance và khả năng thay thế file từ parent. **Không thay ACL file production trong phase13.4H**.
3. Staging có các nhóm `inputs-private`, `source-enabled`, `source-disabled`, `build-enabled`, `build-disabled`, `logs-private`, `manifests-redacted`, `recovery-private`. Đây là sơ đồ dự kiến, chưa có folder/secret mới được tạo.
4. Người dùng tạo password khác nhau, đủ mạnh bằng password manager cục bộ và nhập qua UI không echo hoặc `Read-Host -AsSecureString` trong phiên cục bộ được duyệt. Không gửi trong chat, không đặt trong command argument/env của command capture, transcript, clipboard chia sẻ hoặc sync folder. SecureString không bảo đảm zero plaintext in memory khi renderer phải tạo C++header; cần giới hạn vòng đời dữ liệu và không log/dump.
5. Renderer/staging tool chỉ cập nhật hai field được duyệt ở bản sao config; kiểm tra escape C++ cho ký tự đặc biệt, chặn newline/NUL nếu contract không hỗ trợ, không dùng string-built shell. Kiểm tra khớp/khác bằng boolean; **không assert actual/expected của config, không xuất unified secret diff**, không passwordhash/config hash vào manifest công khai.
6. Capture compiler stdout/stderr/exitcode đầy đủ vào logprivate; không stream raw error ra chat vì compiler có thể in dòng header chứa password. Chỉ xuất diagnostic đã redact và bản tóm tắt allowlist. Không xóa raw evidence; bảo vệ và quy định retention riêng.
7. Bảo vệ cả temp/output/preprocessed header/object/ELF/bin. ArduinoCLI local có `--build-path`/`--output-dir`; dùng path riêng đã bảo vệ, rà TEMP/TMP/cache thực tế trước compile. Không giả định CLI local có `--build-cache-path` (help hiện tại không liệt kê). Không đưa sketchconfig vào cache dùng chung ngoài root bảo vệ.

Chưa có credentials mới được cung cấp theo phương thức này. **Không tạo build hay config giả rồi tuyên bố rotation READY.**

## 4. Firmware A/B sau rotation

Baseline giữ nguyên hotfix13.4F.1:

```text
SHA256 baseline application
D3297B343D9B6B2ED2BAF4B8B03FBC3292A51354D51018746A8863771723A82A
```

| Build dự kiến | Phạm vi |
| --- | --- |
|A: chức năng hiện tại|Source hotfix13.4F.1, ENABLE_PUMP_COMMANDS=true như baseline, cùng sensor/CommandACK/SNTP logic; chỉ credentials đã duyệt và MQTT_HOST nếu IP mới được duyệt riêng. Backend vẫn khóa.|
|B: rollback an toàn|**Cùng hotfix13.4F.1 và cùng credentials mới**, chỉ ENABLE_PUMP_COMMANDS=false. Giữ SNTP30phút/expiry2giờ/revision snapshot/backoff, future2s/MAX5/GPIO26/OFFpriority/failsafe.|

Không lấy firmware12D.2 cũ làm B; binary chứa credential cũ không phải recovery mạng sau rotation. Không sửa source/config baseline đang dùng trong repo; stage bản sao trong protectedroot sau nhập secrets.

Trước bàn giao A/B: chạy đủ host tests controller/parser/serializer/diagnostics/OFFschedule/SNTP/snapshot concurrency/staticguard và offline backend contract cần thiết. CompileCore3.3.12/FQBNesp32:esp32:esp32, upload115200 metadata, hai builddir riêng. Manifest mỗi build gồm version/buildID, source non-secret hashes, binarySHA256/size, guard constants, physical-enable flag, credential-version **nhãn không bí mật** và booleansconfig consistency. Không lưu passwords/passwordhash/configđầyđủ. Build A/B phải chứng minh chỉ khác physical-enable và những field đã duyệt; không nới safety để kết nối.

Sau mọi thay đổi credentials/host/source, hash hiện tại không còn là artifact mới được phép flash; người dùng phê duyệt riêng đúng hashA hoặcB. Host/compilePASS không thay short-on-device acceptance. Trong13.4H không chạy lại test/build đãPASS vì chưa có input mới.

## 5. Broker LAN và phương án áp dụng trên Windows

Read-only tại thời điểm kiểm tra:

- LAN `172.20.10.2:1883`, listener0.0.0.0/:: **PID13960**, parentPID7428.
- Windows service `mosquitto` PID4572/LocalSystem chỉ listen127.0.0.1/::1. **Không Restart-Service mosquitto để xử lý LANinstance** và không test localhost rồi coi là xác minh LAN.
- Token hiện tại không elevated; CIM trả ExecutablePath/CommandLine rỗng cho PID13960. Đọc được file `C:/mosquitto/config/mosquitto.conf`/ACL theo baseline nhưng **chưa chứng minh đó là config thực sự được process13960 nạp**.
- Chỉ chạy offline `C:/Program Files/mosquitto/mosquitto.exe -h`: installed executable báo2.1.2/exit0, hỗ trợ`--test-config`. Không mở listener/broker mới. Dòng “terminating” trong help là processhelp kết thúc, không phải LANbroker bị dừng. Version của **running PID** vẫn chưa attested vì không đọc được executable path.

Gate cần người vận hành có quyền đọc process xác minh, chưa chạy elevated ở đây:

```powershell
# Chỉ đọc, chạy trong PowerShell Administrator khi người dùng chọn làm.
Get-NetTCPConnection -State Listen -LocalPort 1883 |
  Select-Object LocalAddress,LocalPort,OwningProcess
$rotationBroker = Get-CimInstance Win32_Process -Filter 'ProcessId=13960'
$rotationConfigArg = [regex]::Match([string]$rotationBroker.CommandLine,
  '-c\s+(?:"([^"]+)"|(\S+))').Value
[pscustomobject]@{
  PID=$rotationBroker.ProcessId
  Executable=$rotationBroker.ExecutablePath
  ConfigArgument=$rotationConfigArg
}
```

PID có thể đổi; trước lệnh phải refresh binding, không mặc định13960 còn đúng. Chỉ chia sẻ exe/config path, không toàn bộ environment/passwordfile/command output chứa secrets. Cần xác minh owner, console/process manager nào quản lý parent, permission và startup args before cutover.

**Phương án chọn:** passwordfile static và consolebrokerWindows hiện tại chưa có hot-reload channel được nghiệm thu. Vì vậy lên lịch **dừng graceful đúng LANconsole và khởi động lại đúng executable/config sau approval**, không hứa reload không gián đoạn. Không gửi POSIXSIGHUP trên Windows hoặc dùng Ctrl+Break như reload khi chưa kiểm chứng. Không force-kill theo tên process; không đụng loopbackservice4572.

Sau khi xác minh actualbinary/version/config, có thể dùng`--test-config` trên bản config/stagedpasswordfile được duyệt để kiểm tra trước cutover, không startlistener. Không mặc định tính năng của installed2.1.2 áp dụng cho mọi binary chạy khác. Tham khảo [Mosquitto8](https://mosquitto.org/man/mosquitto-8.html), trong đó signals được mô tả cho POSIX.

## 6. MQTT cutover runbook — chưa được phép chạy

Chọn **giữ username ESP32-GF-A-01**, không đổi namespace/ACL%u, backendcredential không thuộc rotation mặc định. Một staticpasswordfile chỉ có một password hoạt động cho account; dự kiến có khoảng mất kết nối có kiểm soát. Không triển khai account “-next” hoặc thêm ACL để zero-downtime nếu chưa được duyệt.

1. Đủ gate staging/actualbroker, password mới nhập cục bộ, buildA/B đã test/hash, approval cập nhật đúngdeviceaccount và một lầnflash; adapterngắt/USB, commands/automationfalse/testtrue/PENDING0. Chụp baseline bằng GET/SELECT trong phiên **execution được duyệt sau**, không chạy trong13.4H.
2. Lưu backup private passwordfile/ACL/startup/config đúnginstance. Tạo bản sao passwordfile trong protectedstaging, cập nhật **chỉ account ESP32-GF-A-01** bằng `mosquitto_passwd` nhập tương tác. Không`-b`, không`-c` trên file hiện hữu, không`-U`, không`-D`; không ghi đè backendaccount. So nội dung các account ngoài scope trong bộ nhớ, chỉ xuất boolean/accountcount. Tool/hash algorithm phải tương thích binarybroker được xác minh, không mặc định newdefault của utility phù hợp runningbroker cũ.
3. Validate stagedconfig/authfile và quyền đọc của đúngbrokeridentity. Bản staging chỉ dùng diễn tập/kiểm tra, **không copy đè toàn bộ lên passwordfile đang dùng**. Approval execution phải cho phép tool cập nhật đúng account trên file hiện hữu; ACL giữ nguyên, không nới anonymous.
4. Người quản lý dừng graceful đúngLANinstance, kiểm tra PID đã thoát/listenerLAN đã giải phóng; service loopback vẫn giữ nguyên. Chạy `mosquitto_passwd <verified-existing-passwordfile> ESP32-GF-A-01` ở chế độ nhập tương tác, nhập lại cùng secret mới từ password manager cục bộ; không `-c`/`-b`. So các account ngoài scope trong bộ nhớ trước/sau và kiểm tra DACL không bị tool làm rộng; nếu khác ngoài scope thì STOP trước khi startbroker. Validate cấu hình rồi khởi động đúngexecutable/config đã chốt. Không khởi chạy broker trùng nếuport còn chiếm. Ghi timestamp/executable/config path/newPID, không secrets.
5. Flash đúng artifactA hash được duyệt khi đủgate; chỉ reset tự động cần thiết. Firmwarecũ có thể reconnect bị từ chối trong khoảng passwordcutover→flash: đây là expectedmaintenance, không báo như sự cố không lường trước. Backend không cần restart chỉ vì brokerrestart; để MQTTclient tự reconnect với credentialbackend không đổi.
6. Chờ WiFi/MQTT/NTP và OFFmới; không épUNKNOWN→OFF bằngSQL. Đối chiếu12readings/3OFF như checklist dưới. Nếu cùngcửa sổ WiFicutover, dùng trình tự mục7 và ghi rõ outage dài hơn; không đổiSSID/IP ngầm.
7. Kiểm tra oldcredentialrevocation **sau approval cutover**: dùng clientIDaudit riêng, không trùngphysicalclient, khôngWill/subscribe/publish/command. Credentials đọc cục bộ trong bộ nhớ từ privateinput, khôngCLI hoặcMQTTURL chứa password. Đúng endpointLAN, testnewpassword CONNECT thành công, oldpassword bị broker từ chối auth ởCONNACK, ghi code đã lọc. Timeout/ECONNREFUSED/TLS/ACLsubscriptiondenial không chứng minh password bị revoke. Testnhầm localhostservice có thể cho kết quả sai.
8. Xác minh mọi connection cũ tới đúngLANbroker đã bị đóng trong restart; giữ lại audit timestamp/PID/authresults. Không coi configfileupdate hoặc client còn CONNECTED là proofrevocation. Không tạoON/OFF để thửcredentials.

Các lệnhmanagingpassword là **runbook cho execution riêng**, không được chạy ởphase này. [mosquitto_passwd](https://mosquitto.org/man/mosquitto_passwd-1.html) cảnh báo `-b` lộargument/history và `-c` ghi đèfile; [Mosquitto config](https://mosquitto.org/man/mosquitto-conf-5.html) xác định `%u` là username. Dùng phương thức nhập cục bộ, không điền passwordthật vào docs/command mẫu.

## 7. Wi-Fi hotspot cutover

Người dùng đã xác nhận hotspotđiệnthoại và có quyền đổi password. SSID/APOS/khả năng giữIP không tự suy đoán; xác nhận tương thíchESP32band/auth trongcửa sổ. PC vàESP32 đang phụ thuộc mạng này, nên đổiWiFipassword có thể làm mất cả đườngLAN tới broker.

**Ưu tiên hai cửa sổ tách nhau** để dễ phục hồi: MQTTdevice trước khiWiFiđổi, nghiệmthu; sau đó WiFi với buildA/B mới tương ứng. Dự kiến phải build/duyệtflash theo từngcredentialset, không dùng một hash cho nhiềuconfig. Nếu người dùng muốn một lầnflash, phải chọn kế hoạch gộp explicit như dưới, không tự đổi chiến lược.

Trình tựWiFi riêng:

1. StageA/B dùng MQTTcredential **đã có hiệu lực** và WiFipasswordmới, giữ SSID nếu không có quyếtđịnh riêng. Chốt brokerIPv4 dự kiến nhưng không bảo đảm hotspot luôn cấp172.20.10.2.
2. Có quyềnflash/đổihotspot riêng, adapter vẫnngắt và đã có recovery mới. Người dùng thay passwordhotspot tạiđiệnthoại; PC reconnect bằng nhập cục bộ an toàn. Không hỏi password quachat hoặc ghi vào`netsh`argument.
3. ĐọcIPv4PC/gateway sau reconnect. Nếu broker không còn172.20.10.2, **STOP trướcflash bản chứahostcũ**; prepareconfig/compile/hash/approval mới cho hostthực. BackendbrokerURL cũng cần approval riêng nếuphảiđổi, không tự sửa env hoặc đặtIPtĩnh/firewall.
4. Khi endpointđãchốt vàLANbrokerhealth phù hợp, flashartifact được duyệt, chờESP32 tựkếtnối. Không coiDHCP giữIP là camkết hoặc cho rằngESP32còn passwordcũ sẽ tự đổiđược.
5. Nghiệmthu đầyđủ. WiFicredentialcũ phải vôhiệu ởAP; việc một client đangkếtnối đượcAP giữsession không chứng minh đãrevoke, cần phương ánAPreconnect do người dùng thực hiện sauapproval, không époutage trong13.4H.

Nếu chọn **gộpMQTT+WiFi**: buildA/B chứa cả hai secretsmới; tạicửa sổngắt: người dùng đổihotspot→PCreconnect/kiểmIP→chốtartifacthost/hash nếuIPkhác→applypasswordfile/restartđúngLANbroker→flashmộtartifactđãduyệt→acceptance. Đây là một outage có kếhoạch, không zero-downtime. Không thểpreapprovehash cũ nếu host/credential thay đổi.

## 8. Failure recovery không tái dùng password đã lộ

- Giữ adapterngắt vàbackendkhóa; OFF/UNKNOWN phải phản ánh evidence thực. Không épdatabase, simulator, nớiACL hoặc bậtanonymous.
- NếuA compile/upload/runtime lỗi, dừng, thu native stdout/stderr/exitcode đã bảo vệ; không tự retryflash. BuildB cùnghotfix/credentials mới là phươngán recovery khi người dùng phêduyệt flash riêng; B phải serialDISABLED/GPIOOFF.
- Nếu MQTTauth lỗi: phân biệt wronginstance/wrongpassword/accountformat/hashalgorithm/permission vàACLdeny. Không quay lại devicepassword đãlộ. Có thể tạo **credential recovery mới** và buildA/B/hash tương ứng sauapproval; backendline nguyênvẹn được kiểm tra bằngboolean.
- NếuWiFi/hotspot/IP bất thường: người dùng giữ hoặc tạo cấu hìnhmạngkhôi phục an toàn với **password mới chưalộ**, rồi chuẩn bịartifact tươngứng. Không restore passwordcũ hoặc flashbinary12D.2cũ để lấyONLINE bằng mọi giá.
- Backupcũ giữ forensic/private, không dùng restoretoànpasswordfile khiến thiết bị trở lại secret đãlộ. Không xóa log/PGDATA/source hoặc rewritehistory. Hếtthờigianmaintenance đãthỏa thuận mà chưađủgate thì chuyển incident/recovery, không retryON hoặc treo quyềnđiềukhiển.

## 9. Acceptance checklist cho execution riêng

- [ ] ĐúngLANbroker/newPID/config/port, không nhầmservice loopback; backendMQTT thực sựCONNECTED.
- [ ] Adapter5Vrútđiện/ESP32USB, chưaON/OFF; Commandsfalse/Automationfalse/TestModetrue/cap1s/PENDING0 ởđúngbackendprocess.
- [ ] ArtifactA hoặcB đúnghash, đúngCOM/chip vàgiới hạn sốlầnnạp theoapproval; Serialversion/credentialversionlabel phùhợp, không insecret.
- [ ] WiFi/MQTTCONNECTED, NTPinitialcallback/reasonOK, interval1800000/expiry7200000, GPIOOFF. A giữenabletheobaseline; B phảiDISABLED.
- [ ] Capture3–5phút vượt mốccrashcũ, khôngabort/Guru/WDT/rebootngoàiýmuốn; không coi đây làlong-termPASS.
- [ ] Ítnhất3batchmới/12readings sourceMQTT, Serialtimestamp/value→PG→APIkhớp; không timestampslạimẫucũ.
- [ ] Ítnhất3PERIODICOFFmới QoS1/retainfalse/dupfalse, đúngtopic/device/actuator/observercontext, DB/APIkhớp; không lấyOFFlịchsửhoặcGPIOlàmotorfeedback.
- [ ] OldMQTTpassword bịauthreject trênđúngLANbroker, newpasswordCONNECTPASS bằngauditClientIdriêng, khôngpublish/Will/command; sessionscũđượcloại/xácminh.
- [ ] Backendprincipal/password/ACL ngoài scopekhôngđổi, accountcount/binding đượcso trongbộnhớ; khônglộhashpassword.
- [ ] Usersconfirms hotspotnewpassword, PC/ESPreconnect vàIPđúng; sựkiệnWiFirevocation cóbằngchứng phùhợp riêng.
- [ ] Cuối cửa sổ Commands/Automationfalse, PENDING0, commandcountkhôngtăng, OFF/readingsmới/ONLINE; Serialđãđóng nếuagentmởtrongphiênđượcduyệt.
- [ ] GiữSNTPperiodicrefresh/recoveryNOT_VERIFIED nếuchưacallbackmới; khôngnângVERIFIED_LIVE/ACTIVE hoặc khẳngđịnhbơmchạy.
- [ ] Evidence/manifests chia sẻđãlọc; secrets/source/bin/privatebackups vẫnđượcNTFSbảo vệ, khôngGit/upload. Khôngxóa incidentlog.

## 10. Approval gates và kết luận

| Gate | Trạng thái13.4H |
| --- | --- |
|Affectedcredentials/inventory/runbook/checklist|Đãchuẩnbị, khôngphơilộgiátrị|
|Hotspotownership|USER_CONFIRMED|
|ĐúngLANlistenerPID13960 vsservice4572|PASS đọcOS tại thờigiểmkiểmtra|
|Actualexecutable/config/owner/version củaLANprocess|NOT_VERIFIED, cầnread-onlyxácminhquyềnphùhợp|
|Protectedstaging/NTFShardening|NOT_IMPLEMENTED; findingquyềnrộngcònmở|
|Newsecrets nhập cục bộ|NOT_PROVIDED|
|BuildA/B dùngsamehotfix+newcredentials|NOT_PERFORMED, chỉ sauinput/hardening|
|Passwordfileupdate/actualbrokergracefulrestart|CHƯAĐƯỢCPHÊDUYỆTchoexecution|
|WiFicutover/IPenvchange|CHƯAĐƯỢCPHÊDUYỆTchoexecution|
|MỗilầnflashA/B, includingrollback|Cầnphêduyệt riêngđúnghash, khôngkếthừapumpapproval|
|Oldcredentialrevocationtest|NOT_PERFORMED, nằmtrongcutoverapprovalriêng|

Không đọc runtime mới quaAPI/SQL trong13.4H vì yêu cầuoffline-only. Safetyfalse/false/testtrue/PENDING0 là **snapshot13.4G**, không được báo như đo mới. Source/config/backendflags không bị thay trongphase này; trướcexecution phải kiểm tra lại bằngruntime thực. Adapter tiếp tụcgiữngắt theoyêucầu, không cóphépđonguồnđộclập.

**CREDENTIAL_ROTATION_PLAN_PARTIAL:** kếhoạch đãcó, nhưng chưađủgate đểnhậpsecrets/build/cutover. Bước phối hợp tiếp theo là xácminhactualLANbroker và phêduyệtprotectedstaging, sauđó người dùng nhậpsecrets cục bộ. Không yêu cầu gửipassword trongchat. Chưađổi credentials/firmware/ACL/quyềnNTFS/.gitignore/WiFi/PG, không cấpđiệnbơm hoặcON/OFF, không nângtrust.

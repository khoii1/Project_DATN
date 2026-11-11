# End-to-end graduation demo plan

## Software demo đã nghiệm thu —29/10/2026

**MVP_DEV_SOFTWARE_ACCEPTED / COMPLETE_VERIFIED_DEV** trong DEV/SIMULATOR. Paginationlỗi2/1đãđượcđónglive:bộlọcLIGHTvềpage1với8row0,farm/zone resetđúng,normal1→2→1hoạtđộng. DùngảnhP1-light-page1-fixed.png thayảnhfailurecũkhi viếtkết quả saufix;ảnhcũgiữchobằngchứngreproduction.

DEVfrontend/backend/TESTđãstopgraceful. Muốntrìnhdiễn sauđó cần startupđúngexistingDEVđượcphéptrongphiênvậnhànhmới;khôngchạyprovisionrunner,seed/migration/reset hoặcmarkerđãtiêuthụ. Dữliệu41SIMULATORreadingsvàacceptancefixturesgiữnguyên.

Kịchbảnsoftwarekếthừalogin/roles,farm/device/sensor,latest/history/chart/CSV,alerts,userlifecycle,irrigationlocked. GắnnhãnSIMULATOR,côngbốcomputedSHADOWNOT_VERIFIED_DEV;khôngbậtcontrolđểdemoUI.

ChưagộpESP32live/bơm/tựđộngphysical. Bước tiếplànghiệmthuIoTthậtđượcphêduyệtriêng,khôngtựchuyểnphase. [Chi tiếtA–I](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

---


## Demo readiness sau FINAL GAP CLOSURE29/10/2026

Có27ảnhUIthật,243browserAPIresponses;history/chart/CSV,alerts,userlifecycle/logout/401 vàirrigationlockedđãđượcthửtrênDEVthực. TấtcảdữliệuSIMULATOR;khôngphảihiệntrạngESP32.

DEVđãdừnggraceful. TrướckhituyênbốsoftwareACCEPTED,cầnxácminhlivebảnresetpagination:khiSOILpage2/size10chuyểnLIGHTphảivềpage1và8row0,khônghiệnpage2/1. BảnfixofflineđãPASS;khôngdùngmarkerđãtiêuthụđểtựstartthêm. Nếuchạydemotrướckhikiểmchứng,phảicôngbốgiớihạnvàresetpagevề1khiđổiloạicảm biến;khôngcoiworkaroundlàPASS.

Khôngprovisioning/seed/migrationlại. Actualbơm/MQTT/ESP32cầnphiênghiệmthurêng;khôngdùngapprovalONcũ. SHADOWgiữnhãnmôphỏng vàkhóa khi khôngcóidentitytarget. [Chi tiếtA–J](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).

---


## Trạng thái demo live29/10/2026,16:15

Đã có9ảnhEdge ứng dụng thật (render/login/dashboard/noF5/recovery/users/forbidden),76APIresponses. ẢnhE-no-f5-new-reading.png chứngminhTEMP42.625/giờ16:14:34UTC+7xuấthiệnkhôngF5,sourcedữliệuSIMULATOR. KhônggọilàESP32live.

Frontend/backend/TESTđãdừnggraceful. BảnCSSlauncherđãPASSlive;harnessno-dataselectorđãsửaoffline,chưarerunlive. Khôngchạyprovisionrunnercũ/seed/migration. Bước tiếplàstartup-onlyđượcduyệt trênexistingDEVđểtiếp tục history/charts/alerts/userstatus/logout/irrigationUI;khôngtựkhởiđộngbằngnpmdevmặcđịnh.

CáccasechưachạyphảigiữNOT_VERIFIED/NOT_EXECUTED;khôngdùngảnhmockthay. SHADOWcomputedpreviewkhôngđượcnớitrustđểPASS. [PART A–K](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Khôngthao tácMQTT/bơm.

---


## Trạng thái demo sau phiên29/10/2026

DEV đãstopgraceful; không mởngaynpmrun devhoặcprovisionrunner. Database/fixturesvàacceptance rowsđượcgiữ. CóbảnfixTailwindDEVlauncherđãcompileCSSofflinePASSnhưngchưarenderapptrongbrowserlive. Cầnphiênstartup-onlymớiđượcduyệt,cùng55433/55001/55173vàcredentialsDPAPIexisting;khôngmigration/seed/reset.

Preflight tươnglai phải kiểmtraEdgevàCSStransform/bundle,khôngchỉabout:blank/HTTP200root. Sauđóchạylogin3role,dashboard/polling/history/chart/CSV/alerts,userstatus/logout,irrigationlocked;SIMULATORnhãn rõ. Không trìnhbàycácbướcnàyđãPASStrongphiên29/10. GiữMQTT/Commands/Automationdisabled;SHADOWfixtureissuevàhardwareacceptancecònriêng.

[Phiên thực tếA–J](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md). Khôngtáisửdụngmarker đãtiêuthụ hoặcphêduyệtONcũ.

---


## Trạng thái demo DEV sau phiên28/10

Database smart_agriculture_mvp_dev/public đã được provision trên TEST55433 với11 migrations và dữ liệu gắn SIMULATOR; credentials demo mới lưu CurrentUser DPAPI private, không ghi vào tài liệu/chat. Backend55001/frontend55173 đã startup và API thật PASS, hiện **đã dừng graceful** cùng TEST. Các URL này chưa mở để trình diễn lúc bàn giao.

Phiên acceptance-only tiếp theo phải tái sử dụng database hiện hữu, không chạy lại provisioning/seed/migrations. Sau startup được duyệt: xác minh health/flags/PENDING0, dùng Edge executablePath đã sửa, demo ADMIN/OWNER/STAFF login;farm scope;4 readings và0/no-data;polling không F5;history/chart/range/CSV;alerts OPEN/ACK/RESOLVED;Irrigation DISABLED và SHADOW được ghi rõ simulation. Browser steps hiện là **checklist chưa nghiệm thu**, không được giới thiệu là đã PASS. CRUD DELETE/user mutations cũng cần bổ sung.

Không dùng npm run dev mặc định để tự trỏ5000/.env production. Chỉ target127.0.0.1:55001/55173 và TEST55433 đã duyệt. Không cần full production Phase13.5 để demo software. Hardware/MQTT thật/pump/ACTIVE automation cần scope và giám sát riêng; không tái sử dụng approval physical cũ. [Evidence hiện hành](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md).


Ngày28/10/2026. Kịch bản đề xuất10–12phút. Không tự mở commands/automation; đọc [scope và blockers](PROJECT_COMPLETION_STATUS.md) trước khi thực hiện.

**Chưa có DEV server để tổng duyệt:** [phiên provisioning28/10](MVP_DEVELOPMENT_RUNTIME_ACCEPTANCE.md) dừng ở TEST authentication, đã smart-stop cluster. Không chạy lại run cũ hoặc dùng production postgres thay thế. Các lệnh simulation/offline dưới đây vẫn tách biệt; không coi chúng là live DEV acceptance.

## Ba loại bằng chứng

| Chế độ | Có thể chứng minh | Không được tuyên bố |
|---|---|---|
| LIVE MONITORING | ESP32→MQTT→backend→DB→API→UI với receipt mới | Quan sát LIVE không phải VERIFIED_LIVE/automatic pump |
| SHADOW / SIMULATION | Quyết định giả lập, safety reasons, PENDING/ACK UI mock | Fixture không nghiệm thu bơm, SQL hoặc identity thực |
| HISTORICAL EVIDENCE | Báo cáo hardware/SQL/restore theo ngày | OFF/timestamp cũ không là trạng thái hiện tại |

## Kiểm tra offline có thể chạy ngay

Tại root, với dependencies và Edge đã cài:

~~~powershell
npm run qa:offline
node backend/node_modules/typescript/bin/tsc --noEmit -p backend/tsconfig.json
npm --prefix frontend run lint
npm --prefix frontend run build
npm run qa:acceptance-browser
~~~

Mô phỏng hiển thị:

~~~powershell
npm run demo:simulation
~~~

Lệnh cuối mở Edge, banner SIMULATION, tự chạy11 checks trên built React với API bị intercept rồi đóng. Chỉ có static server loopback port ngẫu nhiên; không startup backend/Vite/MQTT. Ba ON fixture mô tả PENDING/REJECTED/APPLIED/TIMEOUT, không phải ON thật. Summary và5 ảnh nằm ở build/project-acceptance/browser-<timestamp>/. Headed variant chưa chạy tương tác trong audit; headless cùng flow đã PASS. Đây chưa phải demo full CRUD/live dashboard.

Thiếu Edge/dependencies thì dừng và báo điều kiện thiếu, không tự cài. Test/API Phase1–11, cleanup và simulator cũ có thể ghi DB; không dùng làm fallback an toàn.

## Recovery cần phê duyệt mới

API5000 đang dừng. Không thực thi startup từ tài liệu này trước approval. Hai lựa chọn:

1. **Recovery target hiện hữu:** giữ PostgreSQL/broker đang chạy. Sau approval, SELECT/catalog READ ONLY có timeout xác minh identity/migrations/PENDING/count. Startup duy nhất backend, flags false/false/test true/cap1, theo dõi process/exit; không seed hoặc migration6 ledger.
2. **Development riêng:** người dùng duyệt target/port/DB/schema/roles; synthetic fixtures và MQTT namespace/client riêng. Không fallback DATABASE_URL production hoặc copy dữ liệu thật mặc định. Provisioning/seed/DDL cần approval riêng.

server.ts thực hiện recovery: MQTT/PENDING→FAILED, actuator→UNKNOWN, sau đó ingestion/alert/automation metadata có thể ghi DB. Commands=false không biến startup thành read-only; approval phải bao gồm các tác động đó, không bỏ recovery để chạy được.

Lệnh chuẩn: npm --prefix backend run dev và npm --prefix frontend run dev, chỉ sau approval target. Phiên recovery có kiểm soát có thể chọn node --import tsx src/server.ts từ backend trong foreground; không cài service/supervisor mới. Thống nhất capture stdout/stderr/exit và graceful stop trước khi chạy. AdapterD.1D executeProduction() còn khóa; không ngầm chạy lệnh khác để vượt gate lỗi.

Nếu tiếp tục quy trình D.1G hiện tại, R2.5 cần approval run/hash mới. Cluster55435 không là dependency kỹ thuật của monitoring REST hiện có. Không bỏ live safety preflight để rút ngắn thời gian.

## Checklist live sau recovery: 2–3 chu kỳ

| Kiểm tra | Evidence | Dừng khi |
|---|---|---|
| Identity | Đúng DB5432/public/systemID được pin hoặc dev target đã duyệt; backendPID/start | Sai identity hoặc PID đổi |
| Flags | Serving process và protected API cùng false/false/testtrue/cap1/gatewayDISABLED | Chỉ log cũ/config hoặc flags mâu thuẫn |
| DB safety | PENDING0, command count baseline không tăng | Không xác minh hoặc lệnh lạ |
| MQTT | Authenticated subscribe telemetry/status/state, không clientID trùng | Chỉ TCP listener hoặc subscribe lỗi |
| ESP32 | Serial mới nếu có: WiFi/MQTT/NTP và relayOFF; không mở COM gây reset | Clock invalid hoặc boot bất thường |
| Fresh data |3 recordedAt khác nhau, mỗi batch đủ TEMP_01/HUM_01/LIGHT_01/SOIL_01, sourceMQTT; DB/API khớp | PUBACK mà DB/API không có, stale/future |
| Fresh OFF |3 PERIODIC OFF mới, nonretained/nonduplicate, cùng observer session, sau backend start | UNKNOWN hoặc chỉ OFF lịch sử |
| Browser | Device/dashboard/sensors tự cập nhật, filter/scope đúng, UTC+7, zero không missing | UI/API lỗi, response cũ ghi đè hoặc timestamp tự bịa |

ONLINE không chứng minh clock/cảm biến khỏe; GPIO OFF không xác nhận động cơ/nước. Giữ timestamp guard2s. Không cần monitor Windows60phút cho demo quan sát ngắn, nhưng không kết luận ổn định dài hạn.

## Trình tự trình bày

| Phút | Nội dung | Evidence |
|---|---|---|
|0–1|Bài toán và kiến trúc3 lớp|README, scope MVP|
|1–3|Login/quyền, Farm→Zone→Device→Sensor|Tài khoản dev, outsider403/404; CRUD chỉ DBdev|
|3–5|4 cảm biến thực, value/time/source, khôngF5|3 batches DB/API/browser, không chỉ Serial PUBACK|
|5–6|History/chart/range/alert|Dữ liệu dev có nhãn, threshold/recovery, zero/no-data|
|6–8|Manual pipeline/PENDING/ACK/timeout|Browser mock có banner; hardware lịch sử PARTIAL, không click ON live|
|8–10|Automatic SHADOW|Soil/stale/offline/clock/quota→WOULD_ON hoặc BLOCKED; không ACTIVE|
|10–12|Hạn chế, QA và phương án mất mạng|Matrix, P0/P1/P2, simulation fallback|

Nếu hội đồng bắt buộc tưới tự động phần cứng, SHADOW không đóng được yêu cầu đó; cần nghiệm thu riêng trước bảo vệ.

## CRUD/chart/alerts trên development target

1. Owner tạo/sửa farm/zone/device/sensor; Staff chỉ quyền được cấp; outsider404; invalid/inactive bị từ chối; users route chỉ ADMIN.
2. Simulator chỉ trên dev target đã duyệt, không identity/credential ESP32 thật; sourceSIMULATOR. Kiểm threshold→OPEN→ACKNOWLEDGED→RESOLVED, duplicate/out-of-order không mở trùng.
3. So chart/history counts/min/max/time với DBdev, custom range/relative refresh, CSV escaping và pagination/scope. Chưa thực hiện các thao tác này trong audit.

## Checklist phần cứng nếu cần thử mới

Chỉ là kế hoạch, không cấp quyền thực thi:

- Approval mới cho đúng session/target/mộtONmaxRunSeconds1; operator có mặt, adapter ngắt trước preflight, relay/GND/COM-NO/cực tính đúng, khu vực điện khô. Không dùng approvalB cũ.
- Clock mới, fresh OFF sau reload, ONLINE/noPENDING, testMode/cap1 tại đúng process, automationfalse. Command chỉ bật trong phiên được duyệt.
- Operator tự cấp adapter và tự click một lần; agent không autoON/OFF/retry. Bơm tự chạy trước lệnh, timeout/uncertainty hoặc không dừng: ngắt adapter độc lập ngay.
- Thu CommandId/ACK APPLIED/OFF MAX_RUNTIME/DB/API/browser, xác nhận motor và nước riêng. Không suy độ rộng xung GPIO chính xác từ timestampMQTT.
- Operator rút adapter và xác nhận; hoàn nguyên commands/automationfalse, noPENDING, OFF mới sau recovery và đủ telemetry. Không thêm ON để bắt hình UI: polling2s có thể bỏ qua ON1s.

Automatic physical cần đánh giá/approval riêng; không nối SHADOW vào gateway.

## Rollback và kết thúc

- Mock/QA lỗi: đóng browser, script đóng static server; giữ failure evidence. Không chuyển test sang runtime thật để PASS.
- Code QA mới: gỡ4 scripts + core test và3 npm entries theo diff; không reset mixed workspace hoặc xóa evidence phase cũ. Tài liệu revert riêng không ảnh hưởng runtime.
- Recovery live lỗi: theo stop plan của phiên approval, lưu PID/exit/stdout/stderr; không restart loop/migration/seed hoặc sửa lịch sử DB.
- Cuối demo ghi flags/PENDING thực tế và xác nhận nguồn bơm của operator; ảnh mock không thay chứng nhận live.

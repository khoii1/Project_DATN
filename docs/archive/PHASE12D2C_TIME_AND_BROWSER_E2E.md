# Phase 12D.2C — Windows Time và Browser E2E trước thử bơm

Ngày18/10/2026, cập nhật đến14:39 UTC+7. **Browser E2E thực tế PASS sau sửa lỗi khóa BẬT trên Dashboard. Sau khi người dùng resync lúc14:35, Windows Time đã phục hồi và PASS kiểm tra ngắn hạn qua nhiều đợt đo; ổn định dài hạn/tự phục hồi sau gián đoạn vẫn NOT VERIFIED. Không tự chuyển sang thử bơm vật lý12D.3.**

Không gửi ON/OFF, không bấm BẬT/TẮT trên website, không nạp firmware, không sửa NTP peer/registry/giờ hệ thống, không migration hoặc ép DB OFF. Cả hai cờ backend vẫn false, firmware source lock false; không có command mới hoặc PENDING. Adapter bơm không được cấp nguồn trong quá trình này.

## Cập nhật sau thao tác Administrator của người dùng — 14:35–14:39

Người dùng chạy `w32tm /resync /rediscover` thành công và gửi log; agent **không** resync thêm hoặc thay registry/NTP peer/firmware. Last Successful Sync14:35:25, Leap0, Stratum5, Last Sync Error0, State MachineHold. Peer chuyển Pending → **Active/Mode3 Client**, stratum peer4; nguồn time.windows.com,0x9, ReferenceIP40.81.94.65.

Đã đo lại thực tế, không resync giữa các lần:

| Nguồn / giờ local18/10 | Offset stripchart(ms, dấu âm) | Trạng thái dịch vụ |
| --- | --- | --- |
| Log người dùng14:35:57–14:36:05 | −345.3806, −347.0570, −360.7003, −350.4737, −341.7676 | Leap0/Stratum5/Active/error0 |
| Agent14:36:37–46 | −339.6031, −343.2089, −342.7046, −344.4382, −340.8637 | Leap0/Stratum5/Active/error0 |
| Agent14:37:47–55 | −340.1569, −338.5375, −347.0102, −338.9021, −339.5421 | Leap0/Stratum5/Active/error0 |
| Agent14:38:55–14:39:04 | −349.0868, −350.1396, −351.1488, −337.5248, −349.3080 | Leap0/Stratum5/Active/error0 |

20 mẫu trong khoảng3 phút sau log đầu, dịch vụ còn synchronized ở mốc hơn210s sau last successful sync. **PASS phục hồi trạng thái đồng bộ và ổn định ngắn hạn; không có nghĩa offset gần0 hoặc được chứng nhận chính xác UTC dài hạn.** Offset vẫn khoảng−338 đến−361ms, không cải thiện rõ rệt so với−328 đến−345ms trước resync. Giá trị Phase Offset−0.3641529s là mẫu dịch vụ lưu, phân biệt với từng mẫu stripchart.

HostPoll vẫn10(1024s), SpecialPollInterval không đổi32768s; PeerPoll17(out of valid range) vẫn hiện. Chưa điều chỉnh các giá trị này hoặc kết luận riêng cảnh báo PeerPoll là nguyên nhân lỗi. ReferenceIP của dịch vụ là40.81.94.65; stripchart cùng hostname lúc sau phân giải52.148.114.188. Không coi mọi phép đo là cùng một NTP endpoint cố định.

Chưa quan sát thêm một lần đồng bộ **tự động** sau resync, chưa test lại qua sleep/đổi mạng hoặc hết nhiều chu kỳ dịch vụ: **NOT VERIFIED**. Root Dispersion8.1342249s còn được báo; không dùng stripchart vài phút làm cam kết sai số tuyệt đối hay lý do nới guard2s. Không cần resync lặp chỉ để tìm một sample đẹp hơn; nên quan sát thêm và kiểm tra lại gần phiên thử riêng.

Kiểm tra READ ONLY sau cùng **07:39:06.158Z =14:39:06**: ESP32ONLINE/lastSeen07:38:59.681Z, PUMP_01OFF/stateAt07:38:59.043Z; đủ4 readingsMQTT recordedAt07:38:52.000Z/receivedAt07:38:52.617Z: TEMP25.2/HUM53.8/SOIL10.69/LIGHT0. Chênh617ms vẫn là phép đo hỗn hợp clock/transport, không phải offset thuần. Pending0, commands=false/automation=false/testModetrue, health database/MQTTconnected; latest command vẫn từ16/10. Không ON/OFF, không sửa source hay nạp firmware trong lượt cập nhật này.

**Quyết định mới:** không còn blocker “Windows hiện chưa synchronized” tại thời điểm14:39; đã có cơ sở chuẩn bị xem xét/phê duyệt Phase12D.3 riêng. Chưa được tự bật flag, đổi khóa firmware, cấp điện hoặc thử bơm. Cần kiểm tra lại clock/OFF mới/ONLINE/0PENDING và xác nhận phần cứng sát thời điểm phiên đó. Kết quả dài hạn vẫn giới hạn như trên.

---

## 1. Windows Time — trạng thái TRƯỚC resync, nguyên nhân có bằng chứng

Đã chạy đầy đủ các lệnh truy vấn được yêu cầu. `/query /source` và `/query /configuration` bị Windows từ chối0x80070005 ở phiên không nâng quyền; không tự nâng quyền hoặc thay thế bằng thao tác ghi. Đã đọc các trường cấu hình liên quan từ registry và event log để bổ sung bằng chứng, **chỉ đọc**.

| Chỉ số lúc14:22:32 và14:29:28 | Kết quả |
| --- | --- |
| Service W32Time | Running, Auto |
| Leap Indicator / Stratum | **3 / 0 — not synchronized** |
| Last Successful Sync | 18/10/2026 13:53:12 |
| Source trong status | time.windows.com,0x9 |
| State Machine | 0 Unset |
| Last Sync Error | 1 — no time data available |
| Phase Offset lưu trong status | −1.7685029s; không phải offset stripchart hiện tại |
| Peer | Pending, Mode0/reserved, Stratum0 |
| Time Remaining | ~30992s lúc14:22; ~30576s lúc14:29 |
| MinPollInterval / MaxPollInterval | 10 / 15 |
| SpecialPollInterval | 32768s (~9,10 giờ) |
| ResolvePeerBackoffMinutes / MaxTimes | 15 / 7 |
| Type / NtpServer | NTP / time.windows.com,0x9 |
| MaxAllowedPhaseOffset / HoldPeriod | 1 / 5 |

DNS hiện phân giải được qua `twc.trafficmanager.net` tới52.148.114.188; stripchart nhận phản hồi. Điều này **không đồng nghĩa W32Time đã phục hồi peer hoặc synchronized**.

### Chuỗi sự kiện thực tế

System và Operational log (`Microsoft-Windows-Time-Service/Operational` đang Enabled):

- **13:52:13** System134: DNS resolution error trên peer, mã0x80072AF9/No such host is known; log nói retry15 phút và tăng thời gian thử lại.
- **13:52:13–14** Operational266 reason1: thay đổi power state; provider259 không có chosen reference server. Đây là bối cảnh hệ thống, không phải lỗi firmware.
- **13:52:56** System37 / Operational264: NtpClient nhận lại dữ liệu hợp lệ từ time.windows.com.
- **13:53:10** Operational261: Windows chỉnh từ06:53:12.719Z về06:53:10.951Z; giải thích giá trị Phase Offset~−1.768s còn lưu trong status.
- **14:02:11** Operational266 reason2: thay đổi network interface/topology, yêu cầu rediscover/resync.
- Đến14:29 status vẫn Leap3/peerPending/error1; không có bằng chứng dịch vụ đã tái đồng bộ ổn định sau biến động mạng.

**Kết luận:** có bằng chứng mất khả dụng DNS/NTP khi power/network thay đổi, sau đó peer chưa phục hồi thành nguồn đồng bộ đang hoạt động. Cấu hình special polling dài và thời gian peerPending còn nhiều giờ là yếu tố cần đánh giá để phục hồi nhanh. Chưa chứng minh được cơ chế nội bộ duy nhất làm peer tiếp tục Pending sau khi DNS đã hồi phục; không quy lỗi cho firmware hoặc khẳng định firewall/ISP chặn NTP khi chưa có packet/provider trace tương ứng. Không tự giảm polling, đổi flag peer hoặc chỉnh registry.

## 2. Offset đo theo thời gian thực — trước khắc phục

Ba đợt5 mẫu, cùng máy chủ, cách nhau hơn1 phút; đơn vịms, giữ dấu đúng output w32tm:

| Đợt | Giờ local | Các mẫu offset(ms) | Trung bình |
| --- | --- | --- | --- |
| 1 | 14:22:35–43 | −335.4260, −337.7247, −341.9163, −336.9190, −338.5672 | −338.11064 |
| 2 | 14:23:38–46 | −328.2355, −337.6995, −336.8033, −329.0338, −331.1055 | −332.57552 |
| 3 | 14:25:27–36 | −345.0837, −343.3409, −333.0507, −333.5431, −342.2988 | −339.46344 |

Độ lớn328–345ms trong cửa sổ khoảng3 phút, **không phải3–6ms của lần kiểm tra14:11 trong12D.2B**. Dù nhỏ hơn guard2s hiện tại, dịch vụ vẫn không synchronized; không lấy độ lệch nhỏ hơn2s làm tiêu chí sẵn sàng thử bơm. Không resync trong phiên này nên **offset sau khắc phục và độ ổn định sau resync: NOT VERIFIED**.

### Phân biệt clock skew với độ trễ MQTT

Ví dụ SELECT07:22:44.632Z: readings có recordedAt07:22:37.000Z, receivedAt07:22:37.551Z; chênh551ms. Đây là tổng ảnh hưởng lệch đồng hồ giữa ESP32/Windows, thời gian tạo/gửi payload, broker và xử lý, không phải phép đo551ms network latency hay clock skew thuần.

Trong capture khác: telemetry recordedAt07:26:52.000Z, observer nhận07:26:52.527Z; state PERIODIC recordedAt07:26:51.583Z, nhận07:26:52.027Z. Các khoảng527/444ms cũng không tách riêng từng thành phần. Chưa có đo NTP offset độc lập của ESP32 cùng thời điểm hoặc trace một chiều để phân rã chính xác. Firmware12D.2 đang có timestamp mới/NTP được chấp nhận theo lease và guard hiện hữu; không có bằng chứng buộc đổi firmware NTP. Giữ nguyên guard2s ở backend và firmware.

## 3. Hướng dẫn Administrator trước đó — ĐÃ ĐƯỢC NGƯỜI DÙNG THỰC HIỆN

Phần dưới là hướng dẫn và điều kiện ghi lúc14:22–14:32, giữ để kiểm toán. Kết quả sau resync ở đầu báo cáo thay thế trạng thái chờ bên dưới; không yêu cầu người dùng resync lại.

Agent chưa thực hiện bất kỳ thay đổi Windows Time nào. Mở **PowerShell → Run as Administrator**, chạy:

```powershell
Get-Date -Format o
w32tm /query /configuration
w32tm /query /source
w32tm /query /peers
w32tm /resync /rediscover
w32tm /query /status /verbose
w32tm /query /peers
w32tm /stripchart /computer:time.windows.com /samples:5 /dataonly
```

Không tự đổi peer, registry hoặc đặt giờ thủ công. Nếu resync thất bại/no time data, giữ nguyên khóa bơm và gửi nguyên lỗi để điều tra tiếp; không chạy nhiều lệnh chỉnh cấu hình chồng nhau.

Sau resync thành công, cần nhiều lần đo cách nhau thời gian thực, không resync lặp giữa các lần đo:

```powershell
1..3 | ForEach-Object {
  Get-Date -Format o
  w32tm /query /status /verbose
  w32tm /query /peers
  w32tm /stripchart /computer:time.windows.com /samples:5 /dataonly
  if ($_ -lt 3) { Start-Sleep -Seconds 60 }
}
```

Gửi log trước/sau và chuỗi đo. Cần thấy Leap0, stratum hợp lệ, peer không còn Pending, last sync/error hợp lệ và offset ổn định; sau đó quan sát thêm qua vài chu kỳ polling và sau gián đoạn mạng/power có kiểm soát trong phiên được phối hợp. Ba phút đo không chứng nhận ổn định lâu dài. Nếu cần thay SpecialPollInterval/peer flag, phải lập phương án và xin duyệt riêng; chưa thực hiện ở đây.

## 4. Browser E2E thật — PASS trong phạm vi đã kiểm tra

Browser tích hợp `iab` vẫn không khả dụng; đã đọc skill và thử kết nối/troubleshooting. Sau đó dùng **Playwright-core đã cài trong npm cache và Microsoft Edge headless có sẵn**, không cài package/browser mới. Đây là browser Chromium thật, không phải SSR/unit test. Context mới, localevi-VN, timezone hệ thống browser **Asia/Bangkok (UTC+7)**, không dùng profile cá nhân của người dùng.

Đăng nhập qua form owner hiện hữu, không inject JWT/bypass RBAC. Tắt “Ghi nhớ đăng nhập” cho phiên tạm. Không ghi HAR/trace/storage chứa token; không in mật khẩu. Có activity log đăng nhập bình thường.

Request interceptor chặn mọi mutation ngoài POST/auth/login; không bấm BẬT/TẮT cả khi mock. Kết quả cuối: **pumpButtonClicks=0, disallowedMutations=[], pageErrors=[]**; context/browser test đã đóng trong finally.

| Thao tác thực trên browser | Bằng chứng / kết quả |
| --- | --- |
| Mở localhost5173 | Login page render đúng — PASS |
| Đăng nhập | Form thành công → /dashboard — PASS |
| Dashboard | Chọn Green Farm/Khu A, thấy ESP32-GF-A-01/RELAY_1, OFF và bốn sensor mới; aggregate1online/1offline — PASS |
| Device detail | ESP32-GF-A-01 hiển thị **Trực tuyến**, đủ TEMP_01/HUM_01/SOIL_01/LIGHT_01 — PASS |
| Timestamp | Response backend07:28:37.000Z hiển thị **14:28:37 18/10/26** trên cả4 sensor; giá trị25.1/56.6/9.23/0 — PASS |
| LIGHT=0 | Hiển thị0lux, không thành “Chưa nhận dữ liệu” — PASS |
| Irrigation live | PUMP_01 “Đang tắt”, thời gian báo cáo GPIO từ backend, thông báo MQTT chưa bật; không có nút ON khả dụng — PASS |
| Polling Irrigation | 3 lượt GET quan sát, khoảng2042ms và2036ms sau patch; các lần trước2033/2031 và2038/2046ms — PASS |
| UNKNOWN/OFFLINE | Browser-only response mock, ON disabled; OFFLINE kèm historicalON vẫn hiển thị Chưa xác định — PASS sau patch Dashboard |
| PENDING/REJECTED/TIMEOUT | UI hiện Đang chờ ACK / PUMP_COMMANDS_DISABLED / ACK_TIMEOUT, ON disabled, không hiện Đang bật — PASS browser mock |
| Khôi phục LIVE | Bỏ mock, GET live vẫn OFF/control khóa, không mutation — PASS |

Dashboard ban đầu chọn Khu B chưa cấu hình sensor; chọn đúng **Khu A** là thao tác lọc, không sửa dữ liệu. Trạng thái ONLINE theo từng Device được xác minh ở detail; Dashboard là chỉ số tổng cùng mã thiết bị/khu vực, không giả nhận có một badge ONLINE riêng cạnh mã nếu UI không có.

Badge AUTO / “Tự động: Bật” phản ánh AutomationRule đang enabled, **không phải bằng chứng MQTT_AUTOMATION_COMMANDS_ENABLED=true**. Hai cờ runtime vẫn false; không thay rule hoặc bật automation. Đây là điểm diễn đạt UI có thể cải thiện riêng, không dùng nó để cho phép thử bơm.

## 5. Lỗi Dashboard phát hiện và sửa có bằng chứng

Browser mock chỉ GETactuators, không sửa API server/DB: currentStateUNKNOWN, deviceONLINE, controlEnabled=true/canControl=true. Trước sửa, Playwright ghi **DASHBOARD_MOCK_UNKNOWN onDisabled=false** và assertion FAIL. Backend thật vẫn khóa nên không có request bơm, kể cả nếu người dùng chưa biết lỗi này.

Nguyên nhân `DashboardPage.tsx` chỉ chặn stateON, chưa chặn UNKNOWN. Đã dùng chung `pumpPresentation()` với Irrigation: chỉ BẬT khi OFF/ONLINE/có quyền/không pending/available, normalize OFFLINE thành UNKNOWN cho label và badge; OFF vẫn giữ cơ chế ưu tiên an toàn hiện hữu. Không đổi auth/RBAC/flags hoặc tưới tự động.

Sau sửa, **browser thật chạy lại toàn bộ flow PASS**, cả Dashboard UNKNOWN và OFFLINE đều onDisabled=true; Irrigation các state mock PASS. Thêm source-wiring regression test để tránh Dashboard lại tách khỏi policy chung; bài này là static integration test, không thay cho browser E2E.

Files thay đổi trong Phase này:

- `frontend/src/pages/dashboard/DashboardPage.tsx`: dùng policy hiển thị/control chung.
- `frontend/scripts/irrigation.test.cjs`: regression wiring Dashboard.
- `docs/PHASE12D2C_TIME_AND_BROWSER_E2E.md`.
- Harness/artifact cục bộ ignored: `build/phase12d2c-browser.cjs` và screenshots, không thêm dependency production.

## 6. Giới hạn ON1s / an toàn lệnh — PASS bằng source và offline tests

- `frontend/src/utils/irrigation-control.ts`: manualCommandBody(TURN_ON) thêm maxRunSeconds1, OFF không có runtime. Cả Dashboard/Irrigation dùng Axios service này.
- `backend/src/config/env.ts`: MQTT_PUMP_TEST_MODE mặc địnhtrue, sai định dạng env bị từ chối; không mở MQTT command flag.
- `pump-command-policy.ts` / device-command.service: test mode cap1 độc lập client; bỏ runtime lấy1; client gửi2/5/30 bị từ chối trước create/publish. Ngoài test mode server vẫn cap5; không tự đổi mode.
- Backend ON chặn offline/stale presence và UNKNOWN hoặc OFF thiếu bằng chứng session; frontend policy cũng chặn. ACK/PUBACK khác nhau: chỉ ACKAPPLIED hợp lệ mới xác nhận ON; REJECTED/TIMEOUT không được success giả.
- Firmware local source giữ ENABLE_PUMP_COMMANDS=false, MAX_PUMP_SECONDS5, GPIO26; cap không đổi. PumpProtocol.tick dùng unsigned `now-started_ >= runtime_` từ monotonic millis, chịu wrap; expiry/FUTURE_COMMAND2s/UUID cache/high-water chặn cũ/lặp. Host tests không chạy GPIO vật lý.
- Không gửi command thật để kiểm tra duration; không nạp firmware mới hoặc thay firmware NTP.

## 7. Regression và môi trường thật

| Bài kiểm tra chạy trong Phase12D.2C | Kết quả |
| --- | --- |
| Backend pump/ACK/recovery/timeguard/unknown/runtime | PASS38/38, mock DB/MQTT |
| Device presence | PASS27/27, offline mocks |
| Firmware controller/parser/timestamp/duplicate/fail-safe | PASS36/36, native fake GPIO |
| Firmware diagnostics/delivery/network lease | PASS18/18 |
| OFF scheduler | PASS5 kiểm tra của host executable |
| Serializer C++ → backend contract | PASS6/6 |
| Frontend irrigation policy/SSR/Axios/wiring | PASS8/8 sau patch |
| Polling/StrictMode/race/visibility/unmount | PASS12/12 |
| Lint/typecheck/frontend production build | PASS, chunk>500kB warning không phải failure |
| Browser live + browser-only mock | PASS sau patch, không ON/OFF click |
| Restart backend thực tế trong Phase này | Không lặp; offline regression PASS, bằng chứng phần cứng ở12D.2B được giữ nguyên |
| Windows Time sau Administrator repair | NOT VERIFIED, chưa sửa |

Telemetry thật vẫn cập nhật: SELECT07:29:30.457Z, DeviceONLINE/lastSeen07:29:23.468Z, PUMP_01OFF/stateAt07:29:22.824Z, pending0. Đủ4 readings MQTT recordedAt07:29:22.000Z/receivedAt07:29:22.551Z: TEMP25/HUM56.4/SOIL9.08/LIGHT0. Health HTTP200/database và MQTTconnected; latest commands vẫn từ16/10, không command mới.

Capture broker07:26:52.027Z nhận OFF/PERIODIC recordedAt07:26:51.583Z QoS1/non-retained/non-DUP; telemetry07:26:52.000Z được observer nhận07:26:52.527Z và API hiển thị dữ liệu tương ứng. Không tạo báo cáo OFF giả. Cả hai cờfalse, testModetrue được diagnostic đọc; API live controlEnabledfalse/gatewayModeDISABLED. Firmware source lock vẫnfalse, không chỉnh/nạp trong phiên này.

SELECT bàn giao07:31:43.062Z: DeviceONLINE/lastSeen07:31:41.098Z, PUMP_01OFF/stateAt07:31:40.451Z, pending0; bốn readings sourceMQTT recordedAt07:31:37.000Z/receivedAt07:31:37.614Z: TEMP25/HUM56.2/SOIL9.23/LIGHT0. Latest command vẫn từ16/10. Kiểm tra local config: ENABLE_PUMP_COMMANDSfalse/MAX_PUMP_SECONDS5; SHA256 vẫn `FD1F8D856EF2D1478BC2BFFDF1E5C7227BD2BFB8F8B89B1DBE9198497776BD3E`, không đổi từ12D.2B. Không còn Edge process của Playwright test ở kiểm tra cuối; không đóng browser cá nhân của người dùng.

## 8. Ảnh bằng chứng và tái chạy

- [Dashboard Khu A](../build/phase12d2c-dashboard.png).
- [Device detail và bốn sensor](../build/phase12d2c-device-live.png).
- [Irrigation OFF thật, quyền điều khiển khóa](../build/phase12d2c-irrigation-live-off.png).
- [Irrigation OFFLINE mock trong browser, không phải trạng thái DB thật](../build/phase12d2c-irrigation-mock-offline.png).

Đã xem ảnh Irrigation live để kiểm tra hiển thị thực, không chỉ xét HTTP200. Ảnh/artifact nằm trong build ignored; không chứa màn hình nhập mật khẩu hoặc token. Harness dùng Playwright cache hiện có và Edge, không portable sang máy chưa có chúng; đây là giới hạn tái lập cần ghi rõ.

Lệnh test chính đã chạy:

```powershell
Set-Location C:\DATN\Project_datn\backend
node --test scripts/mqtt-pump.test.cjs
node --test scripts/device-presence.test.cjs
Set-Location ..\frontend
npm.cmd run test:irrigation
npm.cmd run test:polling
npm.cmd run lint
npm.cmd run build
Set-Location ..
& .\firmware\tests\run-host-tests.ps1 -Compiler 'C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\g++.exe'
node.exe build/phase12d2c-browser.cjs
```

## 9. Quyết định chuyển Phase12D.3

**Đã đạt Browser E2E và phục hồi Windows Time ngắn hạn**, cập nhật14:39 ở đầu báo cáo. Có thể chuẩn bị phiên12D.3 để phê duyệt riêng; **chưa được thực hiện thử bơm vật lý trong phạm vi hiện tại**. Không coi offset hiện dưới2s hoặc một resync thành công là bảo đảm dài hạn; cần tiếp tục quan sát và kiểm tra lại điều kiện sát thời điểm được duyệt thử.

Giữ adapter rút điện, firmware DISABLED, commands/automationfalse. Bất kỳ thay đổi firmware physical-enable/nguồn hoặc thử1s đều cần phiên phê duyệt riêng với OFF mới, NTP/clock ổn định, không PENDING và phương án ngắt nguồn độc lập. Không xem GPIO OFF/ACK là feedback motor hoặc nước.

# Checklist bảo vệ đồ án

Ngày05/11/2026. Kế hoạch tài liệu đã hoàn thiện; nghiệm thu sản phẩm còn mở. Không gọi CHECKLIST_COMPLETE là PROJECT_READY_FOR_DEFENSE.

## P0 trước buổi demo phần mềm

- [ ] Native execution được xác minh bằng exact PID/parent/OS start/native exit, không suppress lỗi0xC0000005.
- [ ] Một supervised historical UI session mới được duyệt và hoàn tất sau AW: không Vite overlay, Dashboard4cards,12historyrows/4charts, Detail/Reports/historical labels và SOIL warning, controlsdisabled, Networklatest-readings hợp lệ.
- [ ] READ ONLY6/6paths,11migrations,8identities/12readings/units, CORS204/204/login200, baseline/postcheck/digest/ActivityLog và gracefulcleanup đạt đúng contract. Không chấp nhận ảnh thay native/SQL gates.
- [ ] Operator sẵn sàng trước startup, ảnh thật không secrets và có ngày/phạm vi; kiểm đủ ảnh ngay trong một cửa sổ, không xin chụp bổ sung sau deadline.
- [ ] Bài trình bày phân biệt historical, simulator, telemetry thật, GPIO, motor và nước. Không gọi irrigation automatic physical đã PASS.
- [ ] Thống nhất với hướng dẫn/hội đồng: demo SHADOW + historical có đáp ứng yêu cầu đề cương không? Nếu bắt buộc tự tưới thật, chưa đủ điều kiện nghiệm thu.

## P1 hoàn thiện vận hành / phần cứng có phê duyệt riêng

- [ ] SOIL có kiểm tra raw ADC/wiring/calibration nhiều điểm, version và quality metadata; không suy từ numeric100%.
- [ ] Publisher assurance/session/provenance/clock health và durable safety/budget/idempotency đủ cho VERIFIED_LIVE trước ACTIVE.
- [ ] Credential exposure đã có kế hoạch/rotation được duyệt, không lộ `.env`, binary secrets, logs/password/token trong ảnh/Git.
- [ ] Startup/shutdown tái lập đúng môi trường; không cần bật production để demo DEV.
- [ ] Nếu demo motor: xác nhận nguồn/adapter/relay và operator cắt điện độc lập, scopeON/runtime cụ thể, thu ACK/OFF và motor/nước riêng; kết thúc khóa flags/rút adapter/PENDING0. Không tái dùng approval cũ.

## P2 sau nghiệm thu MVP

Production irrigation migration/wiring, production deployment/TLS và thử resilience dài hạn theo phạm vi riêng. Không coi mọi proposal/cluster55435/R2.5 là dependency bắt buộc để hiển thị12readings trên DEV hiện hữu.

## Required approval — đúng một hành động tiếp theo

**Một lượt file-based hash-only native boundary diagnostic, không startup/live**, như [execution design](FINAL_TEST_RESULTS.md#native-remediation-review-và-gate): pin current revision9 và source/binaries, private create-new evidence/attempt, independent observer giữ handle PowerShell/Node, exact PID/parent/OS start/nativeexit, timeout hữu hạn/cap64KiB, no retry. Chỉ đọc file identity/hash/NTFS/listeners; không DB connection, MQTT/EventLog mới hoặc hardware. Không dùng AX/AZ approvals đã kết thúc.

Approval đó không bao gồm supervised website. Nếu diagnostic đủ điều kiện, website sẽ cần scope approval riêng sau; không gộp quyền migration/production/pump vào request diagnostic. Không chạy bất kỳ diagnostic nào trong đợt tài liệu này.

## Completion status

| Mục | Kết luận |
|---|---|
| Native execution | BLOCKED |
| Frontend Website | PARTIAL; final session BLOCKED |
| Backend/API | PARTIAL — historical DEV/PhaseY evidence, không fresh runtime |
| PostgreSQL | VERIFIED trong isolated tests/restore/historical scope; current runtime không xác minh lại |
| ESP32/MQTT | VERIFIED_REAL trong PhaseY; current connectivity NOT_VERIFIED |
| Manual irrigation | VERIFIED_REAL subcase motor; toàn phiên acceptance PARTIAL |
| Automatic irrigation | SIMULATION_ONLY; physical BLOCKED |
| Soil calibration | BLOCKED |
| README | COMPLETE cho hướng dẫn/scope hiện có |
| System architecture | COMPLETE |
| Demo script | COMPLETE ở mức kế hoạch; chưa thực thi final |
| Defense checklist | COMPLETE ở mức tài liệu; các checkbox còn mở |
| Overall | **NOT_READY_FOR_DEFENSE** |

Điều kiện đổi READY: đóng P0 bằng evidence thực trong scope đã thống nhất; nếu phạm vi bắt buộc automatic physical thì phải đóng thêm calibration/trust/safety và thử vật lý được duyệt. Không phải hoàn tất toàn bộ roadmap production.

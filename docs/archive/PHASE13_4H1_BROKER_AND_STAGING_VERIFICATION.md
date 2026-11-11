# Phase 13.4H.1 — Broker verification & secure staging

## Kết quả mới nhất — tạo staging rỗng theo phạm vi người dùng điều chỉnh

Ngày21/10/2026. Người dùng đã **bỏ điều kiện phải chứng minh không có mọi custombackup trước khi tạo folderrỗng**, nhưng vẫn cấm lưu credentials/firmware chứa secrets khi scope chưa xác minh. Approval10folder được tiếp tục theo thay đổi này, không phải agent tự tuyên bố cloudscopeVERIFIED.

```text
BROKER_EXECUTABLE_CONFIG_VERIFIED (Administrator evidence below)
STAGING_CREATED
STAGING_NTFS_VERIFIED
STAGING_DIRECTORY_COUNT=10
STAGING_FILE_COUNT=0
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
SECRET_STORAGE_NOT_ALLOWED
CREDENTIAL_ROTATION_NOT_PERFORMED
FIRMWARE_FLASH_NOT_PERFORMED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

### Cách triển khai và phạm vi

- Kiểm tra SHA256 scriptgốc trước tạo: **3355DCC175F37E05D8C0475B7B2F0F4681F55F109B9D5B5FED8C85D5833163FF**, PASS; filegốc giữ nguyên, không đặt `-ConfirmOutsideCloudSync`.
- Chuẩn bị variant rõ nghĩa [scripts/phase13-4h1-create-empty-staging.ps1](../scripts/phase13-4h1-create-empty-staging.ps1), SHA256 **0777F38B0D806B450056CE09EBF8AA774BECEF5CADA77F36B9443E4F0F4E1BF9**. Chỉ đổi modegate sang `-AllowEmptyWithUnverifiedBackup`, outputCloudBackupScopeNOT_VERIFIED/SecretStorageAllowedfalse. Giữ nguyên kiểmSID/path/NTFS/knowncloudroots/reparse vàatomiccreatewithACL. Không ép giá trị cloudconfirmation cũ thànhtrue.
- Đúng operatorSID `S-1-5-21-1432835263-483988321-3159128977-1001`, target ngoàiOneDrive đã biết, khôngreparseancestor. Thực thi variant với `-ExecuteApproved -AllowEmptyWithUnverifiedBackup -Confirm:$false` theo phêduyệt cụ thể của người dùng, đúng10target ởmục5.
- Mỗi directory tạo vớiowneroperator, protectedDACL ngay từcreation; chỉ operator vàSYSTEMFullControl, OI/CI, khônginheritanceACE. Không cóUsers/AuthenticatedUsers/Everyone/CodexSandboxUsers.
- **Nghiệmthu độc lập sau tạo:** đọc lạiowner/DACL/ACE/reparse của10folder, duyệttree xácnhận đúng10directory/0file.8folderlá đều rỗng; hai foldercontainer chỉ chứa cácfoldercon đãduyệt.
- So SDDL trước/sau **8target hiện hữu**: repository/build/configlocal/backend.env/brokerconfig/passwordfile/backups/LocalAppData, không thayđổi. Đây làmetadata kiểmtraACL, **không phải tạo backup dữ liệu/ổC hoặc sao chép secrets**.

Bằng chứng: `report/phase13_4h1/empty-staging-acceptance.json`, `report/phase13_4h1/acl-before-empty-creation.json`, `build/phase13-4h1-empty-staging-creation.log`. Không cófilecredential/source/firmware mới nào được đặt vào staging. Không thaycloud/backupconfiguration, không kiểm kêbackup toànmáy lặp lại.

### Trạng thái cuối và công việc độc lập

Read-only11:59:49.920Z (18:59:49UTC+7): Commandsfalse/Automationfalse/TestModetrue, PENDING0/tổng43, ONLINE, freshPERIODICOFF11:59:41.073Z; backend5000PID3572/brokerLAN13960/PG5432PID7848 khôngrestart. ClockHEALTHY tại snapshot ngắn hạn, không đồng nghĩa SNTPdevice đãrefresh. Adapter giữ ngắt theo yêu cầu.

Approvalcreation đã hoàn tất, không xin lại hoặc tự mở rộng sang nhậpsecrets. **Cloud/backupscope vẫn mở** và chỉ chặnsecretstorage/rotation, không chặnpháttriển code/tests không chứasecrets. Phần pháttriển offline tiếp theo được ghi riêng tại [PHASE13_OFFLINE_TRUST_SOIL_PERSISTENCE_READINESS.md](PHASE13_OFFLINE_TRUST_SOIL_PERSISTENCE_READINESS.md).

---

## Lịch sử gate trước khi người dùng cho phép tạo folder rỗng — đã được thay thế bởi kết quả trên

## Cập nhật theo phê duyệt SECURE STAGING CREATION — dừng tại cloud/backup gate

Ngày21/10/2026, UTC+7. Người dùng đã phê duyệt tạo đúng10foldermới **với điều kiện phải xác minh không bị cloud/custombackup theo dõi**. Approval này được ghi nhận; không cần xin lại cùng phạm vi khi điều kiện được thỏa mãn. Đây không phải xác nhận mặc định rằng target ngoài mọi backup.

```text
BROKER_EXECUTABLE_CONFIG_VERIFIED (Administrator audit below)
APPROVED_STAGING_SCRIPT_HASH_PASS
STAGING_CREATION_APPROVAL_GRANTED_CONDITIONAL
CLOUD_CUSTOM_BACKUP_SCOPE_NOT_VERIFIED
STAGING_CREATION_BLOCKED_BY_GATE
STAGING_NOT_CREATED
STAGING_NTFS_NOT_VERIFIED
CREDENTIAL_ROTATION_NOT_PERFORMED
FIRMWARE_FLASH_NOT_PERFORMED
PHYSICAL_PUMP_NOT_TRIGGERED
```

Kiểm tra chỉ đọc trước tạo:

- SHA256 script staging đúng `3355DCC175F37E05D8C0475B7B2F0F4681F55F109B9D5B5FED8C85D5833163FF`.
- Container`Local/SmartAgriculture` vàroot`credential-rotation` đều chưa tồn tại.
- OneDrive env vàOneDriveAccountsregistry cùng trỏ `C:/Users/Acer Swift3/OneDrive`; target nằm ngoài root này.
- Không thấy Dropboxinfo ởLocalAppData/AppDataRoaming hoặc GoogleDriveDriveFSregistry/config ở các vị trí tiêu chuẩn đã kiểmtra. Không thấy process mang các tên sync/backup phổbiến trong lầnquét. Điều này không chứng minh phầnmềm khôngcài/khôngchạytheolịch hoặc không dùngconfigkhác.
- Đọc được203scheduledtasks, không queryerror;26task có tên liên quanbackup/sync. Có registrykeyFileHistory. **Không coi các con số/key này là bằng chứng target đang được backup**, vì chưa xác minh cấu hình include/exclude và việc kíchhoạt thực tế.
- Không thể loại trừ arbitraryscript, agenttạm dừng, job accountkhác hoặc backup toànuserprofile từ name/root checks. Chưa có inventory/cấu hình authoritative cho custombackup, nên không đạt điều kiện “bất kỳ công cụ sync/backup tùy chỉnh” mà người dùng yêu cầu.

**Đã STOP, không tạo folder.** Không chạy `-ExecuteApproved` hoặc tự khai `-ConfirmOutsideCloudSync`;0directorycreate/0ACLchange. Không nhậpsecret/compile/flash/reset/restart/DBwrite/ON/OFF. Commands/Automation không bị thay; không đo runtime mới trong lượt gateoffline này. Adapter tiếp tục phải ngắt theo yêu cầu người dùng.

Bằng chứng đã lọc: `report/phase13_4h1/staging-creation-gate.json`. Không xóa incidentlog, marker hoặc thay ACLparent/production. Không ghi STAGING_CREATED/STAGING_NTFS_VERIFIED vì chưa có thao tác hoặc ACLstaging thực để nghiệmthu.

Phối hợp còn thiếu: người vận hành cung cấp danh sách và phạm vi các công cụ sync/backup tùy chỉnh (hoặc xác nhận sau khi rà soát rằng không sử dụng), đặc biệt các job có thể backup userprofile/AppData. Có thể gửi ảnh cấu hình source/exclusion đã che thông tin nhạy cảm, **không gửi password/token**. Nếu có backupagent theo dõi target, cần quyết định/exclusion hoặc vị trí khác được duyệt riêng; không tự thay cấu hình backup hay đổi target để vượt gate. Chỉ sau khi scope được xác minh mới tiếp tục approval10folder đã cấp, rồi nghiệmthu owner/DACL/reparse cả10folder trước mọi secretinput.

---

## Cập nhật sau kết quả Administrator do người dùng thực hiện

Audit **21/10/2026 lúc11:38:18.6077798Z =18:38:18UTC+7**, `report/phase13_4h1/broker-admin-readonly.json`. Attachment người dùng gửi đã parse đầy đủ và **khớp chính xác JSON audit lưu cục bộ**. Có Elevatedtrue/SameProcessAtEndtrue/BrokerExecutableConfigVerifiedtrue; không phải agent tự nâng quyền.

```text
BROKER_EXECUTABLE_CONFIG_VERIFIED
NTFS_RISK_ASSESSED
STAGING_CREATION_APPROVAL_REQUIRED
STAGING_NOT_CREATED
CREDENTIAL_ROTATION_NOT_PERFORMED
FIRMWARE_FLASH_NOT_PERFORMED
AUTOMATION_ACTIVE=false (không thay flags; runtime đo ở phần lịch sử)
PHYSICAL_PUMP_NOT_TRIGGERED
```

| Thuộc tính broker LAN | Bằng chứng Administrator |
| --- | --- |
|PID LAN|13960, bindings0.0.0.0/::1883; lần kiểm tra read-only sau khi nhận kết quả vẫn cùngPID|
|Owner|DESKTOP-T2P0U4E\\Acer Swift3|
|Executable|`C:\Program Files\mosquitto\mosquitto.exe`|
|Version executable tại path đã xác minh|2.1.2, help exit0|
|Command line/config selection|Đã đọc trong bộ nhớ, `-c C:\mosquitto\config\mosquitto.conf`; các argument khác không dump|
|Config options liên quan|listener1883, allow_anonymousfalse, không include_dir được ghi nhận|
|Passwordfile thực theo selectedconfig|`C:/mosquitto/config/passwords`, absolute/existing; **không đọc contents/hash**|
|ACL thực theo selectedconfig|`C:/mosquitto/config/acl`, absolute/existing|
|Instance khác không được thao tác nhầm|service mosquittoPID4572, LocalSystem, chỉ loopback127.0.0.1/::1|

Gate executable/config selection và owner/version đã được gỡ. Đây là audit process arguments/on-disk configuration, **không phải attestation publisher từng packet hoặc chứng minh rotation đã thực hiện**. Không có reload/restart broker/backend, updatepasswordfile/ACL hoặc cấp nguồn bơm. JSON xác nhận CredentialsChangedfalse/ServicesRestartedfalse/PasswordFileContentsReadfalse.

Chốt phương án vận hành cho cửa sổ rotation được duyệt sau: dùng đúng consoleLAN được parentPowerShell7428 quản lý, owner vận hành dừng graceful ởconsoleđó, kiểm traPID/listenerLAN đã thoát rồi start **đúng executable trên** với`-c` **đúng config trên**. Không dùngRestart-Service mosquitto vì serviceđó làloopbackinstance. Không tự gửiCtrl+C/signal hoặc chạy startcommand trong phiên này; chưa có hot-reload channelWindows được nghiệmthu. Trước cutover phải refreshPID để tránh dùng13960 nếuprocess đãthay.

Adminaudit xác nhận10ACLtargets, findingsquyềnrộng trênrepo/build/config/env/backups vẫn còn. PasswordfileDACLprotected không tự sửa parentbroadACL. Container`%LOCALAPPDATA%/SmartAgriculture` vàroot`credential-rotation` chưa tồn tại trongaudit vàkiểmtra sauđó. **Chưa có phêduyệt stagingcreation mới từ việc người dùng chỉ gửi kết quả audit.**

Bước xin phép riêng tiếp theo: tạo đúng10folderrỗng ởmục5, chỉ operatorSID vàSYSTEMFullControl/OI/CI, owneroperator, protectedDACL, không ACLparenthiệncó/production; xác nhận vị trí nằm ngoài mọicloudsync. Saucreate phải nghiệmthu ACL thực trướcsecretinput. Không nhập secrets, compile hoặc flash theo approvalcreation này.

---

## Lịch sử kiểm tra trước khi có kết quả Administrator — không phải kết luận mới nhất

Ngày 21/10/2026, giờ Việt Nam UTC+7. Đã đọc `PHASE13_4H_CREDENTIAL_ROTATION_PREPARATION.md` trước thao tác. Chỉ đọc broker/ACL/runtime; chuẩn bị script, **chưa tạo staging hoặc sửa NTFS production**.

```text
BROKER_EXECUTABLE_CONFIG_NOT_VERIFIED
NTFS_RISK_ASSESSED
STAGING_CREATION_APPROVAL_REQUIRED
STAGING_NOT_CREATED
CREDENTIAL_ROTATION_NOT_PERFORMED
FIRMWARE_FLASH_NOT_PERFORMED
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
VERIFIED_LIVE_NOT_READY
```

## 1. Broker LAN — kết quả trực tiếp và giới hạn quyền

Không dùng PID cũ làm mặc định. Query lại listener1883 xác nhận tại lần kiểm tra này:

| Instance | Binding/PID | Chủ sở hữu/quản lý |
| --- | --- | --- |
|LAN broker|0.0.0.0/::1883, **PID13960**|GetOwner thành công: `DESKTOP-T2P0U4E\Acer Swift3`; parent7428 làpowershell.exe|
|Loopback service|127.0.0.1/::1:1883, **PID4572**|Windows service`mosquitto`, LocalSystem|

Đây là hai instance khác nhau. Không Restart-Service mosquitto để xử lý LANinstance. Agent không dừng process, gửi signal, khởi chạy broker listener hoặc restart service.

Token hiện tại là tài khoản vận hành nhưng **Elevated=false**. CIM đọc được PID/parent/owner, nhưng ExecutablePath vàCommandLine củaLANbroker đều rỗng; chưa thể đọc `-c` thực của process. Vì vậy:

- Chưa xác minh executable/config thực và version của runningLANinstance.
- File baseline `C:/mosquitto/config/mosquitto.conf` đọc được ở13.4H có passwordfile `C:/mosquitto/config/passwords`, ACL `C:/mosquitto/config/acl`; **chưa được gắn chắc chắn vào PID13960**. Không sửa các file theo giả định này.
- Installedbinary `C:/Program Files/mosquitto/mosquitto.exe -h` ở13.4H báo2.1.2, nhưng không tự coi đó là image củaPID13960 khi chưa đọc đượcExecutablePath.
- Chưa có chứng cứ hotreload channel trênWindowsconsole này. Phương án vận hành đề xuất sau khi xác minh/được duyệt: người sở hữu dừng graceful đúngconsoleLAN, kiểm traPID/listener đã thoát rồi start đúngexe/config; không force-kill theo tên, không Ctrl+C ởconsole không xác định, không đụngservice4572. Chi tiết stop/start chỉ chốt sauadminaudit.

Không tự nâng token hoặc gọiRunAs/UAC; không báo đã kiểm tra vớiAdministrator khi chưa có quyền.

### Script audit chỉ đọc để chạy Administrator

Đã chuẩn bị [scripts/phase13-4h1-broker-readonly.ps1](../scripts/phase13-4h1-broker-readonly.ps1). Mặc định yêu cầuAdministrator, tự phát hiệnLANPID từbinding, không ghim13960. Nếu nhiềuLANPID hoặcprocess không phảiMosquitto thìSTOP.

Script đọc executable/commandline trong bộ nhớ, owner, `-c/--config-file`, chỉ xuất structuraloptions trongallowlist, pathpasswordfile/ACL, service mapping vàACL. **Không đọc nội dung passwordfile, không dumpconfig hoặc environment**. Nếuconfigrelative/includes chưareview thì không cấpVERIFIED. Version lấy bằng `-h` của executable đã đọc từprocess, capturestdout/stderr/exitcode; đó là help process không mởlistener, không restartbroker. Script không xuất arbitraryplugin/options.

Đã chạy `-AllowUnelevated` để thu bằng chứng hiện có, không dùng option đó để vượtVERIFIEDgate: `report/phase13_4h1/broker-unelevated-readonly.json`, BrokerExecutableConfigVerified=false. Mặc địnhscript không tự fallback sangmode này.

Người dùng mở **PowerShell Run as Administrator** bằng đúng account vận hành rồi chạy thao tácchỉđọc:

```powershell
Get-FileHash 'C:\DATN\Project_datn\scripts\phase13-4h1-broker-readonly.ps1' -Algorithm SHA256
& 'C:\DATN\Project_datn\scripts\phase13-4h1-broker-readonly.ps1'
```

Hash script audit đã review:

```text
03E99C3DB2ACB512D8EFBE19D666AF93BCE9889BB3C21FD00F379904FF5683C9
```

Repo hiện có quyềnghi rộng, nên phải xác nhận script/hash không bị đổi trước khi chạy elevated. Nếuexecutionpolicy chặn, STOP để review/chọn cách chạy phùhợp; không tự nới policy toàn máy. Chỉ chia sẻ JSON đã lọc, không gửi passwordfile/configlocal. Kết quả sẽ ở `report/phase13_4h1/broker-admin-readonly.json`; **file này chưa được tạo** trong lần thực hiện hiện tại.

Ngay cả khi auditadmin xác minh process `-c` và fileondisk, đó chưa phải attestation độc lập toàn bộ policy trongRAM. Nếuconfig thay đổi sau processstart hoặc cóinclude/plugin cần review thì ghi giới hạn, không suy ra credentialrotation đã áp dụng.

## 2. NTFS đã kiểm tra — không sửa

ACL đọc mới cho đúng các target yêu cầu, lưu trong `broker-unelevated-readonly.json`:

| Path | Kết quả |
| --- | --- |
|Repository, build|DACL kế thừa; Administrators/SYSTEM FullControl, BUILTIN UsersReadAndExecute, AuthenticatedUsersModify và specialinheritedrule. Không dùng làm secretstaging riêng.|
|firmware/.../config.local.h|Kế thừa, UsersReadAndExecute/AuthenticatedUsersModify. Secretplaintext có nguy cơ bị đọc/sửa bởiaccount khác.|
|backend/.env|Cùng finding rộng; không đổiACL hoặc nội dung.|
|C:/mosquitto/config|Parent có quyền rộng; cần review đường thaythế/tamperfile trướcrotation, không chỉ ACLfile đích.|
|C:/mosquitto/config/passwords|ProtectedDACL, ownerAdministrators, explicitFullControl cho account vận hành; nội dung/hash không được đọc. Chưa khẳng định chắc chắn đây là passwordfile củaLANprocess khi thiếu`-c`proof.|
|C:/DATN/backups|Kế thừa rộng nhưrepo; không gọi làprotectedbackup. Không di chuyển/xóa evidence.|
|Userprofile/AppData/Local ancestors|Không cóReparsePoint tại cácancestorhiệncóđãkiểmtra. Local có operator/SYSTEM/Admin và inheritedReadAndExecute choCodexSandboxUsers; newstaging phải loạiinheritance thay vì kếthừamùquáng.|
|Local/SmartAgriculture và credential-rotation|**Đều chưa tồn tại**. Không có ACLstaging thực để nghiệmthu.|

Tài khoản cần quyền:

- Operator `DESKTOP-T2P0U4E\Acer Swift3`, SID `S-1-5-21-1432835263-483988321-3159128977-1001`: quản lý staging/source/build/private logs.
- SYSTEM (`S-1-5-18`): quyền hệ thống cần thiết, dự kiến được cấp trên staging mới.
- Không cấp explicitUsers/AuthenticatedUsers/Everyone/CodexSandboxUsers. Không thêmDeny choUsers vì operator cũng có thể thuộcgroup đó và bị tựkhóa.
- Administrators không cần explicitACE trong proposal tối thiểu; admin/SYSTEM vẫn có khả năng quản trị/takeownership, NTFS không bảo vệ trước admin/malware chạy cùng operator. Nếu cầnbreakglassACE bổsung phải review riêng.
- BrokerLAN hiện cùng accountoperator: NTFS không tách được process cùngSID. Không thêm brokerprincipal hoặc quyền rộng vào staging. Quyềnfiledeploy cần chốt theoactualowner sauadminaudit; serviceLocalSystem4572 không phảiinstance cần thao tác.

Đây là đánh giá ACL, chưa impersonateaccount khác để thử đọc. Không kết luận đã có khai thác hoặc filepassword bị đọc chỉ từ findingquyềnparent.

## 3. Đường staging và cloud/reparse checks

Đề xuất:

```text
C:\Users\Acer Swift3\AppData\Local\SmartAgriculture\credential-rotation
```

Ngoài repository `C:/DATN/Project_datn`. OneDrive envroot hiện có `C:/Users/Acer Swift3/OneDrive`, không bao chứa target. Cácexistingancestor được kiểm tra khôngreparse. Không chứng minh mọi backupagent/customsync đều chưa monitorLocalAppData; người dùng cần xác nhận target ngoài mọicloudsync trước execution. Không thay vị trí hoặc cấu hình cloudclient.

## 4. Script staging đã chuẩn bị, chưa chạy thật

[scripts/phase13-4h1-create-staging.ps1](../scripts/phase13-4h1-create-staging.ps1), hash:

```text
3355DCC175F37E05D8C0475B7B2F0F4681F55F109B9D5B5FED8C85D5833163FF
```

Chốt phạm vi của script:

1. BoundđúngoperatorSID vàLocalAppData hiện tại; không nhận arbitrarytargetpath. Nếu chạy bằng accountadminkhác thìSTOP, không âm thầm tạo staging choaccountkhác.
2. NTFSdriveC, ngoàirepo, không thuộcknowncloudroots, kiểmtraeveryexistingancestor/reparse trướccreate và trước mỗi target. Executioncòn cần `-ConfirmOutsideCloudSync` từ người dùng.
3. MặcđịnhPLAN_ONLY; `-ExecuteApproved -WhatIf` vẫn không thayđổi gì. Chỉ execution có flagapproval riêng vàShouldProcess mới được tới creation.
4. **Từ chối nếu container hoặcroot đã tồn tại**; khôngsetACL thưmục cũ. Không sửa quyềnLocalAppData hoặcparenthiệncó.
5. Tạo directory vớisecuritydescriptor **ngay lúc create**, dùngWin32CreateDirectoryW. Nếupath đã xuất hiện/race thìfail, không ápACL lênfoldercótrước. Không tạo folderworld-readable rồi mớiharden.
6. Chỉ haiAllowACE: operatorSID vàSYSTEM, FullControl/OI/CI, propagationNone; owneroperatorSID, DACLprotected/removeinheritance. Áp dụng lúc tạo từngdirectorymới, không resetACLproduction.
7. Re-read owner/DACL/twoSIDs/rights/inheritance sau mỗi create; bất thường thìSTOP_NO_CREDENTIAL_INPUT. Có thể để lại cácfolderrỗng đã tạo an toàn khi lỗi; **không tự xóa/cleanup hoặc sửaACL hiện hữu**. Lầnchạylại sẽSTOP nếutargetđãcó, cần reviewriêng.
8. Không nhập secrets, tạo firmware/config/build, sao chép oldcredentials, thayenv/ACLbroker/passwordfile hoặc gọiCOM/network. Script chỉ tạo cácfolderrỗng sauapproval.

Mọi scriptcógiới hạn: cần localmachine/account tin cậy, tránh writerđồngthời trongparent. Chưa có actualdirectoryacceptance hoặc test bằngaccountkhác; không gọi stagingSECURE_PASS từWhatIf.

### Kiểm thử offline đã chạy

- PowerShellASTparse cảhaiscript: PASS.
- Staging `-WhatIf`: PLAN_ONLY, không tạo folder.
- Staging `-ExecuteApproved -WhatIf`: vẫnPLAN_ONLY, kiểmtra`SmartAgriculture`chưa tồn tại sau lệnh: PASS.
- C#nativehelper compile: PASS; **không gọi phươngthứcCreate** hoặc nativeCreateDirectory trong test.
- Read-onlyaudit `-AllowUnelevated`: exit0, báo đúngNOT_VERIFIED và lưuACL; không coi nhưadminevidence.

Logplan `build/phase13-4h1-staging-plan.log`, scriptchecksums `report/phase13_4h1/script-hashes.json`. Không cópositiveNTFScreationtest vì user chưaphêduyệtcreate. Không flash, xóabằngchứng hoặc chạyregression cóDBwrites.

## 5. Phạm vi NTFS cần xin phép riêng — chính xác10foldermới

Do container chưa tồn tại, đề nghị approval bao gồm **tạo mới** container rồistagingroot (không sửa bấtkỳparentcótrước) và8foldercon:

```text
%LOCALAPPDATA%/SmartAgriculture                         [mới, container]
%LOCALAPPDATA%/SmartAgriculture/credential-rotation     [mới, root]
  inputs-private/
  source-enabled/
  source-disabled/
  build-enabled/
  build-disabled/
  logs-private/
  manifests-redacted/
  recovery-private/
```

Cả10foldermới đềuowneroperator/protectedDACL/operator+SYSTEMFullControl. Không đụng `C:/DATN`, repository/build, firmwareconfig, backend.env, brokerconfig/passwordfile/ACL, backups, userprofile/AppData/LocalACL hoặccloudroots. Không chỉnhquyềnparenthiệncó. Nếu chỉ phêduyệtrootmàkhôngcontainer mới thì cần sửa phạmviscript trướcchạy, không tựtạo thêm.

**Chưa chạy lệnh thực thi dưới đây. Chỉ dùng sau approvalcreation riêng và xác nhận outsidecloudsync:**

```powershell
& 'C:\DATN\Project_datn\scripts\phase13-4h1-create-staging.ps1' `
  -ExecuteApproved -ConfirmOutsideCloudSync
```

Mặc định cóShouldProcessconfirmation. Approvalcreation không bao gồm nhậpcredentials/compile/flash/rotation. Saucreate phải nghiệmthu thực tế bằngGet-Acl, kiểmtra mọiACE/inheritance/owner/reparse, xácnhậnkhông cóbroadaccess vàbằngchứngđườngđẫnvẫnđúng. Chỉ sauacceptance riêng mới cho phépinputsecret. Không lấyoperatorwrite-success hoặcfoldertồn tại thaychoACLacceptance.

## 6. Runtime safety read-only

GET/SELECTREADONLY **11:32:44.979Z (18:32:44UTC+7)**, `report/phase13_4h1/runtime-readonly.json`:

- Commands=false, Automation=false, TestMode=true, PENDING0/tổngcommands43 khôngđổi.
- ESP32ONLINE, PERIODICOFFmới11:32:41.062Z. KhôngsendON/OFF, khônggiảlậpOFF hoặc sửaPG.
- Clock-healthadapter hiện **UNKNOWN** trong snapshot này. Không chỉnhWindowsTime, khônggọiclockPASS hoặc suy raSNTPrefreshESP32 đãđạt chỉ từONLINE/OFFmới. Đây khôngphải phiênthửbơm hoặcVERIFIED_LIVEpreflight.
- Firmware/source/config khôngđổi, khôngCOM/reset/flash. Giữadapterbơmrútđiện theo yêu cầu vàxácnhận duytrì trướcđó; không cóđo nguồn vật lý độc lập.

Không nângtrust/automation, khôngmigration, khôngrestartservice. Read-onlynormal-auth có thể tạoaccesslog thôngthường; không cólệnhđiềukhiển hoặc sửaDBdomain.

## 7. Kết luận và phối hợp tiếp

**BROKER_EXECUTABLE_CONFIG_NOT_VERIFIED** vì phiên hiện tại khôngAdministrator, mặc dùLANPID/owner vàservice mapping đãđọcđược. Bước cần phối hợp trước tiên là người dùng chạy auditread-only bằngAdministrator, khôngrestart; dùngJSONđãlọc đểchốt actualexe/config/passwordpath/ACL/version vàconsolecontrol.

**NTFS_RISK_ASSESSED / STAGING_CREATION_APPROVAL_REQUIRED.** Script tạo10foldermới đãchuẩnbị/testoffline, chưaexecute; không nhậpcredentials cho đếnkhiACLstaging thực đãnghiệmthu. Đềnghịapprovalriêng đúngphạmvimục5, không suy diễn phêduyệt13.4Fflash hoặcphêduyệtPUMP trướcđây thànhquyềnNTFS/rotation.

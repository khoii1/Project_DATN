# Smart Agriculture — Offline trust, SOIL metadata và production persistence readiness

Ngày21/10/2026, UTC+7. Thực hiện theo yêu cầu tiếp tục phát triển sau13.4H.1, không yêu cầu kiểm kêbackup dài hoặc lặp nghiệmthu đãPASS. Không rotation/flash/reset/restartservice/migration/ON/OFF.

## 1. Kết quả đã hoàn thành

```text
STAGING_CREATED_AND_NTFS_VERIFIED (10 directories / 0 files)
CLOUD_BACKUP_SCOPE_NOT_VERIFIED
STAGING_SECRET_STORAGE_NOT_ALLOWED
SOIL_METADATA_OFFLINE_PROPOSAL_IMPLEMENTED
SOIL_METADATA_TESTS_PASS=50/50
OFFLINE_REGRESSION_PASS=458/458 (408 existing + 50 new)
PROPOSAL_TYPECHECK_PASS
PRODUCTION_WIRE_CONTRACT_UNCHANGED
PRODUCTION_PERSISTENCE_NOT_DEPLOYED
VERIFIED_LIVE_NOT_READY
AUTOMATION_ACTIVE=false
PHYSICAL_PUMP_NOT_TRIGGERED
```

Tạo10folder rỗng đãnghiệmthu trong13.4H.1; không đặtsecrets/firmware vàođó. Code/tests/proposal ởrepository **không chứa credentials** nên tiếp tục độc lập, không cần lấy cloudscopeVERIFIED làm điều kiện viếtcode.

File mới/chỉnh sửa trong đợt này:

- `scripts/phase13-4h1-create-empty-staging.ps1`: modeempty-only, không tự khai cloudverified; originalscript/hash giữnguyên.
- `backend/proposals/live-trust/soil-metadata-contract.ts`: pure, strict structural contract draft; **không nằm trong src runtime**.
- `backend/scripts/soil-metadata-proposal.test.cjs`:50tests mới.
- Báo cáo13.4H.1 và báo cáo này; các file evidence/log đãlọc trongreport/build.

Không đổiPrisma schema/migrations, MQTTschema, firmware, package.json, routes, evaluator hoặcfrontend. Moduleproposal nằm ngoàisrc và không được productionimport; backendPID3572 vẫn giữnguyên sau khi thêmcode/tests.

## 2. Rà soát publisher/device assurance

Hiện tại đã có:

- `live-provenance/evidence-store.ts`: MQTTreceipt→DBcorrelation, TTL, topic matching, retained/duplicate/out-of-order rejection, observergeneration/session. Đây là **backendobservation**, không phải chứngminh publisher/device.
- `live-readiness/identity-policy.ts`: purepolicy brokerattestation/sessionsequence; kể cảpositivefixture, packet/deviceidentity vẫnfalse/NOT_VERIFIED. Chưa có trustedadapter thu vàxácthựcinput.
- Adminaudit13.4H.1 xácminh executable/configpath/version/accountowner, nhưng chưa đủ chứngminh account đó gửi từngpacket hoặc key riêng trên board. Không lấy audittrue rồi gán publisherVerifiedtrue.
- Telemetryv1 không có authenticateddeviceboot/session/sequence/keyversion; firmwarecache/sessionfloor vàobservergeneration không thaydurableanti-replay.

### Kiến trúc đề xuất, chưa triển khai live

1. **Tách hai tầng:** brokerpolicyassurance và device-messageproof. Mọi HTTP/MQTT tựkhai`trusted/approved` không được dùng làm bằngchứng.
2. Brokerassuranceadapter cần nguồn kiểmchứng bindingprincipal→topic, denytests, effectiveconfig/ACL, credentialrotation/revocation, protectedtransport và connectionaudit có TTL. Adminconfigpathaudit chỉ là một phần input, không phải chứngthực cảpolicyRAM. Không tự cấpBROKER_POLICY_ATTESTED từdiskfile.
3. Deviceenvelope cần sessionestablishment được xácminh, boot/sessionidentifier, credential/keyversion, measurement/globalmessagesequence vàproof gắn device+session+sequence+recordedAt+topic+payloaddigest/schema. Lựa chọnHMAC/signature/keyprovisioning phải duyệt riêng và testoffline trước. Proofpossession key không được quảng cáo là hardwareattestation khi key nằm trongfirmware cóthểcopy.
4. Backendverifier xácthựcproof trước correlate/trust; khóa/session registry và replayhigh-water phải durable/atomic, không reset counter do broker/observerreconnect. Missingkey/session/cursor hoặc revoke/timeout thìfailclosed, khôngfallbackfixture.
5. V1vẫn ingest/display observation-only. Nếu thêm envelope/metadata trênwire, cần contractversioning riêng và compatibility rollout; không thêm field vào v1strict đangchạy. Backendparser version mới trướcfirmwareopt-in, nhưng không bậttrust đếnkhitrustedadapter đủ bằngchứng.
6. Snapshotassembler hiện policy/cycle/budget/safety/snapshot/decision=null, engineCalledfalse. Sau này trustedassembler phải ghép receipt/clock/freshOFF cùngsession vớipolicy vàdurableledgers thật; không bịa dữliệu thiếu hoặc nối trực tiếp vàoevaluatorproduction có sideeffects.

Quyếtđịnh hiện tại: **không triển khai trustadapter chạylive** trong request này, vì chưa có signed/protected evidence source vàkeyprovisioning approved. Ràsoát/policyofflinePASS không có nghĩa publisherauthenticationPASS.

## 3. Metadata SOIL — code proposal và ranh giới trust

`soil-metadata-contract.ts` xuất `inspectSoilMetadata(input,expectedBinding)`, không importDB/MQTT/engine, khôngDate.now/timer hoặcmutableglobal. Chỉ structuralassessment cóexpectedbinding độc lập.

| Nhóm | Field draft |
| --- | --- |
|Version|`metadataVersion: soil-diagnostics-proposal-v1` — version của proposalmetadata, **không phải schemaVersionMQTT đang chạy**|
|Binding|deviceCode, sensorCodeSOIL_01, recordedAtUTCcanonical, deviceSessionId, measurementSequence, calibrationVersion|
|ADCsummary|adcResolutionBits12, adcSamples1..64, rawAdc/adcMin/adcMax integer0..4095, min≤raw≤max; nếu1sample thìcảba bằngnhau|
|Contact|UNKNOWN / DISCONNECTED / SELF_REPORTED_CONNECTED, không biến sốADC hoặcselfreport thànhphysicalcontactproof|

Expectedbinding sau này phải đến từ independentlyvalidatedreceipt/calibrationregistry/session, không copy từinputclient đểtựxácminh. Validateversion/requiredfields/unknownfields, IDs/time/sequence/calibration vàADCsummary; reject cácfield`trusted/approved/publisherIdentityVerified/irrigationAuthorized`.

Output luôn:

```text
publisherIdentityVerified=false
deviceIdentityVerified=false
qualityStatus=NOT_VERIFIED
irrigationAuthorized=false
productionAdapterImplemented=false
```

`STRUCTURALLY_VALID` chỉ nói shape/binding khớp context đã truyền, **không phải calibrationapproved hoặc soilVALID**. ADCrail vẫn giữ0/4095 vàcảnhbáoreview, không thànhnull/zero giả. ContactDISCONNECTED/UNKNOWN giữnguyên chứ khôngdefaultconnected. Snapshotnormalize làbảnsao, khôngmutateinput.

Đường tiếp theo: approvedcalibrationregistry gồm version/scope/drywet/contactdiagnostic/expiry; mapmetadata đã được authenticatedbound vào pure `assessSoilQuality` cósẵn. Qualitypolicy hiện railINVALID/stale/spike/noise/stuck/clamp vẫn cóprecedence; proposalvalidator mới **không thay thế/nới policy đó**. Calibration3500/1507 hiện tại là config quan sát, không tự ký duyệt nônghọc.

Không thêmrawADC/bootId/calibrationfield vào MQTTv1, không ghépSeriallog vớireading lịch sử để nângtrust, không ghi SOILmetadata mới vàoPG. Đây là code-ready đểreview/test contract, chưa phải ingestionadapter hoặcfirmware triểnkhai.

Trước triểnkhaiwire mới còn cần chốt payloadsize/parserbounds/RAMbuffer và canonical encoding, nhất là khi thêm proof/session; không nối chuỗi vào bufferfirmware hiện tại mà không đo size. Sequence trongproposal dùng safeinteger, overflow/rollover phảifailclosed hoặc chuyểncontractencoding córeview, không tự épuint64 vềnumber. Khôngsửachủđộngfirmware để gửi cácfield này trong đợt hiện tại.

## 4. Kế hoạch production persistence cho6bảng — khôngDDL

Nguồn hiện có: `backend/prisma/proposals/irrigation-persistence.prisma`, `irrigation-constraints.sql`, `IrrigationPersistenceFoundation` và `PostgresTestIrrigationRepository`. Phase13.3B đã38/38SQLintegrationPASS ởtest55433, không phảiproductiondeployment. Theo catalogread13.4G, production chưa có6bảng; **không chạy lại cluster/testSQL hoặc migration trong đợt này**.

| Bảng | Vai trò production cần nghiệmthu |
| --- | --- |
|irrigation_cycles|Versionedpolicy/cycle/soak/session vàlastreading/OFF, mộtopencycle/actuator/mode|
|irrigation_decision_logs|Append-onlydecision/evidence/policyversion; appkhôngUPDATE/DELETEaudit|
|irrigation_daily_budgets|Quota/ngày/mode/actuator, counters/version, không reset bằngclockrollback|
|irrigation_budget_reservations|Reserve/charge/release/UNCERTAIN cùngtransaction vớiintent vàbudget|
|irrigation_command_intents|Uniqueidempotency/correlation/fingerprint, trạngthái dispatch/ack/uncertain; khôngresendON khi uncertain|
|irrigation_safety_states|Fault/emergencystop/manualoverride/cooldown/session vàclock/dayhigh-waterdurable|

### Các bước cần phêduyệt riêng trước áp dụng

1. Review productiondataidentity/version/search_path/schema vàread-onlydiff; đánhgiálock/FK/index/permissions. ProposalSQL hiện có tên khôngschema-qualified: khi chuyểnmigration phải chốt qualifiedschema/targetguard, không đểsearch_path nhầmproduction/test.
2. Chuẩn bịmigrationartifact/review add-only vàpreflight/rollbackdocument; bảo vệlegacySensorReading/DeviceCommand/AutomationRule, không sửa6ledger proposalvào mainschema rồi tự`dbpush`. **Không tạobackup mới trong task hiện tại**; trướcmigrationproduction thực tế, nếu cầnbackup phải xinapprovalriêng vàchốtphươngánrestore đã kiểm chứng.
3. Roles riêng migrator/app; appkhôngadmin/owner, auditappend-only/constraints thực ởPG. NewDatetime dùngtimezonecontract rõràng, không castnhầm legacytimestampnaive vàtimestamptz như diagnostic13.4G.
4. Productionrepository làadapter mới đượcreview, **không bỏ testguards** của PostgresTestIrrigationRepository hoặc fallbackDATABASE_URL. Foundation hiện chỉ chấpnhậnFAKE/ISOLATED_TEST vàsourceFIXTURE/MOCK, chưađượcphépVERIFIED_LIVE: phải thiết kế production-read/shadow path riêng, không tháochốt để “dùng luôn”.
5. Transaction lockorderđồngnhất peractuator, CASversion, uniqueopenintent/idempotency vàatomicbudget+reservation+audit. Haiworker/twoprocess cùngrequest chỉ tạo mộtreservation; retry chỉ lookup, khôngdispatchlần2.
6. Crash/restart từDISPATCH_CLAIMED/PUBLISHED/ACK_TIMEOUT/BROKER_LOST phải UNCERTAIN+faultlatch vàgiữquota antoàn; không autoreplayON. FreshOFFauthenticated+operatorreview theo policy, khôngclearfault từDBOFFcũ.
7. TáchmodeSHADOW/ACTIVE và thật/fixture budgets. Manualcommands cần phối hợp occupancy/priority đểkhông race vớifutureautomatedintent; không thaylogicmanual hoặcautomation hiện tại trong task này. Chưa có outbox/dispatcher production đượcduyệt, không tự tạo DeviceCommand.
8. Triểnkhai tối đa read-only/SHADOW sauapproval, flagsfalse vàkhông nối gateway. Nghiệmthu trêninstanceđộc lập trước, rồiproductionmigration/readinessacceptance riêng. Rollback không DROPledger/audit hoặc resetschema ngầm; cósự cố thìdisablefeature/latch và giữ bằngchứng.

Đây là plan/checklist, không migrationfile chạyproduction, không modeACTIVE hoặc adapter tự khởichạy. Durabledeviceanti-replaykey/sessionregistry còn cần thiếtkế riêng, không giả sử6irrigationtables đã bao phủmọi identityhigh-water.

## 5. Kết quả tests và giới hạn

Lệnh đã chạy:

```powershell
node --test backend/scripts/device-presence.test.cjs backend/scripts/mqtt-pump.test.cjs backend/scripts/shadow-irrigation.test.cjs backend/scripts/shadow-preview.test.cjs backend/scripts/irrigation-persistence.test.cjs backend/scripts/live-provenance.test.cjs backend/scripts/live-readiness.test.cjs backend/scripts/soil-metadata-proposal.test.cjs
node backend/node_modules/typescript/bin/tsc --noEmit --strict --target ES2022 --module commonjs --skipLibCheck backend/proposals/live-trust/soil-metadata-contract.ts
```

**458/458PASS,0FAIL/0SKIP**, typecheckPASS. TAP `report/phase13-offline-development-tests.tap`.50testmới gồm missing/nonobject/unknown/trustfields,device/session/time/sequence/calibrationbinding, malformedexpectedcontext, ADCNaN/range/count/minmax/singlesample/rail, contactselfreport, immutability vàguardproduction khôngimportproposal.408testcũ bao phủpublisher/sessionpolicy/soilquality/readiness, presence/pumpACK, SHADOW vàfakepersistence.

Không chạy migration/integrationproduction, không rerun38SQLtest đãPASS hoặchostfirmwaretest khi firmwarekhôngđổi. Không browserE2E hoặc flash/hardwaretest; không coi mockproof làliveproof. Source module thửnghiệm ngoài`src`, chưa có endpoint hoặccurrent wirebehavior mới.

## 6. Runtime cuối và các gate còn thiếu

Read-only11:59:49.920Z (18:59UTC+7), `report/phase13-offline-development-runtime.json`: Commandsfalse/Automationfalse/TestModetrue, PENDING0/tổng43, ESP32ONLINE/freshPERIODICOFF11:59:41.073Z; configs/artifacthashunchanged. CáclistenerPID vẫn backend3572/LANbroker13960/PG7848, khôngrestart. ClockHEALTHYngắnhạn, không nâng SNTPrefresh/recovery thànhPASS.

| Hạng mục | Kết luận |
| --- | --- |
|10folderrỗng/owner/DACL/reparse/productionACL khôngđổi|PASS, bằngchứngNTFS thực|
|Cloud/custombackup scope|NOT_VERIFIED, chỉ chặnsecretstorage/rotation|
|OfflineSOILmetadata code/tests|PASS, chưa đượctriểnkhailive|
|Publisher/deviceproof adapter/provisioning|NOT_IMPLEMENTED production|
|Calibration/contactqualityapprovedregistry vàliveadapter|NOT_IMPLEMENTED/NOT_VERIFIED|
|6ledger production/schema/appadapter/durable recovery|NOT_IMPLEMENTED production, cótestfoundation lịch sử|
|SNTPperiodicrefresh/failure recovery/long-termstability|NOT_VERIFIED nếu chưa cólog phùhợp|
|VERIFIED_LIVE/ACTIVEautomation|NOT_READY, không bật|

Cần approval riêng chosecretinput sauxửlý scope cònmở, rotationbroker/hotspot, buildcredentials mới/flash từnghash, futurewirecontract/firmwaremetadata vàproductionmigration/role/deployment. **Không cần các approval đó để tiếp tục viết purecode/tests/docs không chứasecrets.** Không yêu cầu phêduyệtbơm hoặc tạobackupổC cho côngviệcoffline.

Kết thúc: stagingrỗngđãhoàntất, tiếnđộsource/tests tiếp tục, cácguardproduction giữnguyên; không traođổi antoàn lấyfalsePASS.

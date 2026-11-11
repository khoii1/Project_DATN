# Eclipse Mosquitto for Phase 11

This configuration is for authenticated local/LAN development on TCP port 1883. It is plaintext MQTT and is not suitable for exposure to the Internet. Production must use `mqtts://` with a CA and broker certificate.

## Windows setup

1. Install Eclipse Mosquitto 2.x from the official installer.
2. Create directories such as `C:\mosquitto\config` and `C:\mosquitto\data`.
3. Copy `mosquitto.conf.example` to `C:\mosquitto\config\mosquitto.conf` and `acl.example` to `C:\mosquitto\config\acl`.
4. Create the password file without committing it:

```powershell
mosquitto_passwd -c C:\mosquitto\config\passwords smartagri_backend
mosquitto_passwd C:\mosquitto\config\passwords ESP32-GF-A-01
```

Enter `<backend-password>` and `<device-password>` interactively. Never put real credentials in this repository. Start and verify:

```powershell
mosquitto -c C:\mosquitto\config\mosquitto.conf -v
Test-NetConnection 127.0.0.1 -Port 1883
```

On Linux, use the same files with Linux paths and run `mosquitto -c /etc/mosquitto/mosquitto.conf -v`.

## Debug commands

```powershell
mosquitto_sub -h 127.0.0.1 -p 1883 -u smartagri_backend -P <backend-password> -q 1 -t "smart-agriculture/v1/devices/+/telemetry"
mosquitto_sub -h 127.0.0.1 -p 1883 -u smartagri_backend -P <backend-password> -q 1 -t "smart-agriculture/v1/devices/+/status"
```

These are placeholders, not real passwords. `-P` exposes the password in process arguments; prefer the credential-safe, read-only project probe below. Do not publish a synthetic ONLINE or use retained status to test live presence. Retained status is deliberately ignored by the backend; wait for a real non-retained device heartbeat.

## Windows: two brokers on port 1883 (Phase 12C)

A Windows Mosquitto service bound to `127.0.0.1`/`::1` can coexist with another broker listening on `0.0.0.0`/`::`. A successful connection to `127.0.0.1:1883` therefore does not prove that the backend reaches the broker used by ESP32 over Wi-Fi.

```powershell
Get-NetTCPConnection -State Listen -LocalPort 1883 | Format-Table LocalAddress,LocalPort,OwningProcess
Get-NetTCPConnection -State Established -RemotePort 1883 | Format-Table LocalAddress,RemoteAddress,OwningProcess
Get-NetIPAddress -AddressFamily IPv4 | Format-Table IPAddress,InterfaceAlias
cd C:\DATN\Project_datn\backend
node scripts/diagnose-device-presence.cjs
```

The probe uses existing backend credentials without printing them, SELECTs the device/readings and passively subscribes for 30 seconds. It never publishes or writes the database. When the configured host is LAN, it also compares the loopback broker using a separate client ID. Never run a simulator to diagnose the physical device.

For this environment on 2026-10-16, ESP32's confirmed host is `192.168.1.6`; the local backend `.env` was aligned to `MQTT_BROKER_URL=mqtt://192.168.1.6:1883`. This is a machine-specific correction, not a portable default. If Wi-Fi IP changes, align both endpoints again or reserve the address. Do not blindly change `.env.example` for other machines.

Long term, operate one explicitly configured authenticated broker reachable from both loopback and LAN. Review service configuration before stopping any broker; this task did not stop/reconfigure either Mosquitto process, change ACL/passwords or alter firewall rules. See `docs/PHASE12C_DEVICE_PRESENCE_FIX_REPORT.md` for verified facts and remaining hardware checks.

Anonymous clients, wrong passwords, and publishing into another device's namespace must be rejected. The future `commands/+` and `command-acks/+` permissions only reserve the topic contract; the backend does not publish commands in Phase 11.

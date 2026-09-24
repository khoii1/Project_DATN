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
mosquitto_pub -h 127.0.0.1 -p 1883 -u ESP32-GF-A-01 -P <device-password> -q 1 -r -t "smart-agriculture/v1/devices/ESP32-GF-A-01/status" -m '{"schemaVersion":1,"deviceCode":"ESP32-GF-A-01","status":"ONLINE"}'
```

Anonymous clients, wrong passwords, and publishing into another device's namespace must be rejected. The future `commands/+` and `command-acks/+` permissions only reserve the topic contract; the backend does not publish commands in Phase 11.

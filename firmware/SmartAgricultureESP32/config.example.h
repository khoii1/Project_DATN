#pragma once
// Copy to config.local.h in this directory. Never commit that local file.
// Board/pins follow the user's already tested wiring; do not change wiring.
static constexpr bool ENABLE_PUMP_COMMANDS = false;
static constexpr char WIFI_SSID[] = "YOUR_WIFI_SSID";
static constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
static constexpr char MQTT_HOST[] = "172.20.10.2"; // Recheck Windows IPv4 before use.
static constexpr unsigned short MQTT_PORT = 1883;
static constexpr char MQTT_USERNAME[] = "ESP32-GF-A-01";
static constexpr char MQTT_PASSWORD[] = "YOUR_DEVICE_MQTT_PASSWORD";
static constexpr char MQTT_CLIENT_ID[] = "ESP32-GF-A-01-physical"; // Unique; no simulator with this ID.
static constexpr char DEVICE_CODE[] = "ESP32-GF-A-01";
static constexpr char ACTUATOR_CODE[] = "PUMP_01";
static constexpr char TOPIC_PREFIX[] = "smart-agriculture/v1";
#define RELAY_PIN 26
static constexpr unsigned char DHT_PIN = 4;
static constexpr unsigned char I2C_SDA_PIN = 21;
static constexpr unsigned char I2C_SCL_PIN = 22;
static constexpr unsigned char SOIL_PIN = 34;
static constexpr int SOIL_DRY_ADC = 3500;
static constexpr int SOIL_WET_ADC = 1507;
static constexpr unsigned int TELEMETRY_INTERVAL_MS = 15000;
static constexpr unsigned int STATUS_INTERVAL_MS = 15000;
static constexpr unsigned int MAX_PUMP_SECONDS = 5; // Never >5 in this first release.
static_assert(MAX_PUMP_SECONDS >= 1 && MAX_PUMP_SECONDS <= 5, "First pump integration cap is 1..5 seconds");
static_assert(SOIL_DRY_ADC > SOIL_WET_ADC, "Adjust calibration, dry must exceed wet ADC");

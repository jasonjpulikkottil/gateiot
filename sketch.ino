#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Servo.h>
#include <DHT.h>

// ============================================================
// Pin Definitions
// ============================================================
#define SS_PIN    PA4
#define RST_PIN   PB0
#define BLUE_LED  PA2
#define RED_LED   PA1
#define SERVO_PIN PB14
#define DHT_PIN   PB11
#define DHT_TYPE  DHT11

// ============================================================
// Timing Constants
// ============================================================
#define GATE_OPEN_MS     10000   // Gate stays open 10 seconds
#define SERIAL_TIMEOUT_MS 5000  // Wait up to 5 s for API response
#define DHT_INTERVAL_MS   2000  // Refresh DHT reading every 2 s
#define DISPLAY_IDLE_MS   2000  // Refresh idle screen every 2 s

// ============================================================
// State Machine
// ============================================================
enum GateIoTState {
  STATE_IDLE,        // Polling for card swipes
  STATE_WAITING,     // UID sent to serial, awaiting GRANT/DENY
  STATE_GATE_OPEN,   // Access granted, gate open, counting down
};

GateIoTState state = STATE_IDLE;
unsigned long stateEnteredAt = 0;

// ============================================================
// Objects
// ============================================================
Adafruit_SH1106G display(128, 64, &Wire, -1);
MFRC522 rfid(SS_PIN, RST_PIN);
Servo myServo;
DHT dht(DHT_PIN, DHT_TYPE);

// ============================================================
// Sensor Globals
// ============================================================
float currentTemp = 0;
float currentHum  = 0;
unsigned long lastDhtRead    = 0;
unsigned long lastIdleUpdate = 0;

// ============================================================
// Helper — Display
// ============================================================
void showScreen(float temp, float hum, const char* line1) {
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(2);

  // Line 1
  display.setCursor(0, 0);
  display.print(line1);

  // Line 2 (Temperature)
  display.setCursor(0, 20);
  display.print("T:");
  display.print(isnan(temp) ? 0.0f : temp, 1);
  display.write(247);
  display.print("C");

  // Line 3 (Humidity)
  display.setCursor(0, 42);
  display.print("H:");
  display.print(isnan(hum) ? 0.0f : hum, 1);
  display.print("%");

  display.display();
}
// ============================================================
// Helper — Build hex string from RFID UID
// ============================================================
String getUidHex() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ============================================================
// Helper — Open / Close gate
// ============================================================
void openGate() {
  myServo.write(90);
  digitalWrite(BLUE_LED, HIGH);
  digitalWrite(RED_LED,  LOW);
}

void closeGate() {
  myServo.write(0);
  digitalWrite(BLUE_LED, LOW);
  digitalWrite(RED_LED,  LOW);
}

// ============================================================
// Setup
// ============================================================
void setup() {
  Serial.begin(115200);

  SPI.begin();
  rfid.PCD_Init();
  Wire.begin();
  dht.begin();

  myServo.attach(SERVO_PIN);
  myServo.write(0);

  pinMode(BLUE_LED, OUTPUT);
  pinMode(RED_LED,  OUTPUT);
  digitalWrite(BLUE_LED, LOW);
  digitalWrite(RED_LED,  LOW);

  if (!display.begin(0x3C, true)) {
    // OLED failed — blink RED indefinitely
    while (1) {
      digitalWrite(RED_LED, HIGH); delay(200);
      digitalWrite(RED_LED, LOW);  delay(200);
    }
  }

  // Initial sensor read
  currentTemp = dht.readTemperature();
  currentHum  = dht.readHumidity();

  showScreen(currentTemp, currentHum, "SCAN");
}

// ============================================================
// Loop — Non-blocking state machine
// ============================================================
void loop() {
  unsigned long now = millis();

  // ── Periodic DHT read ──────────────────────────────────────
  if (now - lastDhtRead > DHT_INTERVAL_MS) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHum  = h;
    lastDhtRead = now;
  }

  // ── STATE: IDLE ────────────────────────────────────────────
  if (state == STATE_IDLE) {
    // Refresh idle display every 2 s
    if (now - lastIdleUpdate > DISPLAY_IDLE_MS) {
      showScreen(currentTemp, currentHum, "SCAN");
      lastIdleUpdate = now;
    }

    // Poll for new card
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      String uid = getUidHex();

      // Send JSON payload to Python gateway over USB serial
      Serial.print("{\"uid\":\"");
      Serial.print(uid);
      Serial.print("\",\"temp\":");
      Serial.print(currentTemp, 1);
      Serial.print(",\"hum\":");
      Serial.print(currentHum, 1);
      Serial.println("}");

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();

      // Flush any stale data in the serial buffer before waiting for the new gateway response
      while (Serial.available() > 0) {
        Serial.read();
      }

      showScreen(currentTemp, currentHum, "WAITING");
      stateEnteredAt = now;
      state = STATE_WAITING;
    }
    return;
  }

  // ── STATE: WAITING (for GRANT / DENY over serial) ──────────
  if (state == STATE_WAITING) {
    // Timeout check
    if (now - stateEnteredAt > SERIAL_TIMEOUT_MS) {
      showScreen(currentTemp, currentHum, "DENIED");
      digitalWrite(RED_LED, HIGH);
      delay(800);
      digitalWrite(RED_LED, LOW);
      state = STATE_IDLE;
      return;
    }

    // Check for incoming command
    if (Serial.available()) {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();

      if (cmd.startsWith("GRANT")) {
        // Parse optional name from "GRANT:Alice Johnson"
        String name = "";
        int colon = cmd.indexOf(':');
        if (colon != -1) name = cmd.substring(colon + 1);

        openGate();
        if (name.length() > 0) {
          name.trim();
          int spaceIdx = name.indexOf(' ');
          String firstName = (spaceIdx != -1) ? name.substring(0, spaceIdx) : name;
          if (firstName.length() > 10) {
            firstName = firstName.substring(0, 10);
          }
          String greeting = "Hi: " + firstName;
          showScreen(currentTemp, currentHum, greeting.c_str());
        } else {
          showScreen(currentTemp, currentHum, "ALLOWED");
        }
        stateEnteredAt = now;
        state = STATE_GATE_OPEN;

      } else if (cmd.startsWith("DENY")) {
        showScreen(currentTemp, currentHum, "DENIED");
        digitalWrite(RED_LED, HIGH);
        delay(1500);
        digitalWrite(RED_LED, LOW);
        state = STATE_IDLE;
      }
      // Ignore anything else (e.g. empty lines)
    }
    return;
  }

  // ── STATE: GATE_OPEN ───────────────────────────────────────
  if (state == STATE_GATE_OPEN) {
    if (now - stateEnteredAt > GATE_OPEN_MS) {
      closeGate();
      showScreen(currentTemp, currentHum, "SCAN");
      state = STATE_IDLE;
    }
    // Display countdown (optional)
    // No blocking — just wait for timer
    return;
  }
}
/*

MPU 9250: (address 0x69)
VCC --> 3.3V 
GND --> GND
SCL --> A5
SDA --> A4
AD0 --> 3.3V ** Change address to 0x69

GPS: 
VCC --> 3.3V
GND --> GND
TXD --> 10
RXD --> 11


(Working)
LCD: 
VSS --> GND 
VDD --> 5V
V0  --> Potentiometer (output) 
RS  --> 7
RW  --> GND
E   --> 6
DB4 --> 5
DB5 --> 4
DB6 --> 3
DB7 --> 2 
LED+--> 5V
LED---> GND

RTC: (adress 0x68)
GND --> GND
VCC --> 3.3V
SDA --> A4
SCL --> A5


*/

//All libraries
#include <Wire.h>
#include "RTClib.h"
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <SkyMap.h>
#include <LiquidCrystal.h>
#include <Wire.h>

//MPU and Magnetometer
//Address of MPU and magnetometer and register of accelerometer output starting point
#define MPU9250_ADDRESS 0x69
#define AK8963_ADDRESS  0x0C
#define ACCEL_XOUT_H    0x3B

// Calibration variables
int16_t mag_max[3] = { -32768, -32768, -32768 };
int16_t mag_min[3] = { 32767, 32767, 32767 };
float mag_offset[3] = {0, 0, 0};
float mag_scale[3] = {1.0, 1.0, 1.0};
bool calibrating = true;
unsigned long calib_start_time = 0;
const unsigned long calib_duration = 30000; // 30 seconds

// Low-pass filter variables
float alpha = 0.2;  // Smoothing factor
float magX_filt = 0, magY_filt = 0, magZ_filt = 0;
float pitch_filt = 0;
float heading_filt = 0;


//size of stars hashmap
#define TABLE_SIZE 13


// LCD pin setup: RS, EN, D4, D5, D6, D7
LiquidCrystal lcd(7, 6, 5, 4, 3, 2);

//Push button setup
const int buttonPin = 8;
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;
unsigned long lastPrintTime = 0;
const unsigned long printInterval = 5000; // 5 seconds
int currentIndex = 0;

//Star custom data type
typedef struct {
  const char* key;
  float ra_deg;
  float dec_deg;
  int occupied;
} HashMapEntry;

//Create Hashmap 
HashMapEntry hashMap[TABLE_SIZE];

unsigned int hash(const char* str) {
  unsigned long hash = 5381;
  int c;
  while ((c = *str++)) {
    hash = ((hash << 5) + hash) + c;
  }
  return hash % TABLE_SIZE;
}
  //hashmap functions
void hashmap_insert(const char* key, float ra, float dec) {
  unsigned int index = hash(key);
  while (hashMap[index].occupied) {
    index = (index + 1) % TABLE_SIZE;
  }
  hashMap[index].key = key;
  hashMap[index].ra_deg = ra;
  hashMap[index].dec_deg = dec;
  hashMap[index].occupied = 1;
}

HashMapEntry* hashmap_get(const char* key) {
  unsigned int index = hash(key);
  unsigned int start = index;

  while (hashMap[index].occupied) {
    if (strcmp(hashMap[index].key, key) == 0) {
      return &hashMap[index];
    }
    index = (index + 1) % TABLE_SIZE;
    if (index == start) break;
  }
  return NULL;
}

HashMapEntry* getNextStar() {
  int startIndex = currentIndex;
  do {
    currentIndex = (currentIndex + 1) % TABLE_SIZE;
    if (hashMap[currentIndex].occupied) {

      return &hashMap[currentIndex];
    }
  } while (currentIndex != startIndex);
  return NULL; // fallback
}

//RTC setup
RTC_DS3231 rtc;

//GPS Setup
SoftwareSerial serial_connection(10, 11); 
TinyGPSPlus gps;

//define variables for azimuth and altitude calculation
int year, month, day, hour, minute, second;
double local_timezone_offset = -7;
double Time_utc;
double latitude, longitude;
double initialLat = 34.128;
double initialLng = -118.211;
double RA, dec;
double j2000;
double Local_sidereal_time;
double Hour_angle;
double Az;
double Alt;

void setup() {

  Serial.begin(115200);
  Wire.begin();
  serial_connection.begin(9600);
  Serial.println("System Start");

  pinMode(buttonPin, INPUT_PULLUP); // Button pin as input with pull-up

  //lcd text setup and formating
  lcd.begin(16, 2);
  lcd.noAutoscroll();
  lcd.print("Initializing...");
  delay(1000);
  lcd.clear();

  //intialize hashmap
  if (!rtc.begin()) {
    Serial.println("Couldn't find RTC");
    while (1);
  }

  hashmap_insert("Sirius",     101.287,  -16.716);
  hashmap_insert("Betelgeuse", 88.7929,    7.4071);
  hashmap_insert("Rigel",      78.6345,   -8.2016);
  hashmap_insert("Vega",       279.2347,  38.7837);
  hashmap_insert("Altair",     297.6958,   8.8683);
  hashmap_insert("Aldebaran",  68.9800,   16.5092);
  hashmap_insert("Antares",    247.3519, -26.4320);
  hashmap_insert("Spica",      201.2983, -11.1614);
  hashmap_insert("Polaris",     37.9546,  89.2641);
  hashmap_insert("Capella",     79.1723,  45.9979);

  for (int i = 0; i < TABLE_SIZE; i++) {
    if (hashMap[i].occupied) {
      currentIndex = i;
      break;
    } 
  }


  // Initialize MPU9250 (manually no library)
  Wire.beginTransmission(MPU9250_ADDRESS);
  Wire.write(0x6B);  // PWR_MGMT_1
  Wire.write(0x00);
  Wire.endTransmission(true);
  delay(100);

  Wire.beginTransmission(MPU9250_ADDRESS);
  Wire.write(0x37);  // INT_PIN_CFG
  Wire.write(0x02);  // BYPASS_EN
  Wire.endTransmission(true);
  delay(100);

  Wire.beginTransmission(AK8963_ADDRESS);
  Wire.write(0x0A);  // CNTL1
  Wire.write(0x02);  // Continuous mode 1 (8Hz)
  Wire.endTransmission(true);
  delay(100);

  calib_start_time = millis();
  Serial.println("Rotate the MPU9250 for calibration...");

}

void loop() {

  int reading = digitalRead(buttonPin);
  //Serial.print("Button raw state: ");
  //Serial.println(reading);  // Should print 1 when not pressed, 0 when pressed
  // Read GPS data

  while (serial_connection.available()) {
    gps.encode(serial_connection.read());
  }

  if (reading == LOW && lastButtonState == HIGH) {
    // Button was just pressed
    Serial.println("Button pressed");  // Confirm the button is being read as pressed
    HashMapEntry* newStar = getNextStar();
    if (newStar != NULL) {
      Serial.print("Now tracking: ");
      Serial.println(newStar->key);
      
    }
  }
  lastButtonState = reading;



  // Only proceed if we have valid location
  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
  } else {
    //Serial.println("Waiting for GPS signal...");
    //delay(2000);
    latitude = initialLat;
    longitude = initialLng;
  }

  // Get time from RTC
  DateTime now = rtc.now();
  year = now.year();
  month = now.month();
  day = now.day();
  hour = now.hour();
  minute = now.minute();
  second = now.second();

  read_MPU9250();


  if (millis() - lastPrintTime >= printInterval) {
    lastPrintTime = millis();

    // Print date, time, and GPS coordinates
    Serial.print("Date: ");
    Serial.print(year); Serial.print("-");
    Serial.print(month); Serial.print("-");
    Serial.print(day); Serial.print("  ");

    Serial.print("Time (24hr): ");
    if (hour < 10) Serial.print("0");
    Serial.print(hour); Serial.print(":");
    if (minute < 10) Serial.print("0");
    Serial.print(minute); Serial.print(":");
    if (second < 10) Serial.print("0");
    Serial.println(second);

    Serial.print("Latitude: ");
    Serial.println(latitude, 6);
    Serial.print("Longitude: ");
    Serial.println(longitude, 6);

    // Astronomy calculations
    SKYMAP_date_time_values_t dt;
    dt.day = day;
    dt.month = month;
    dt.year = year;
    Time_utc = SKYMAP_hh_mm_ss2UTC(&dt, hour, minute, second, local_timezone_offset);



    HashMapEntry* star = &hashMap[currentIndex];
    if (star->occupied) {
      RA = star->ra_deg;
      dec = star->dec_deg;

      j2000 = SKYMAP_j2000(&dt);
      Local_sidereal_time = SKYMAP_local_sidereal_time(j2000, Time_utc, longitude);
      Hour_angle = SKYMAP_hour_angle(Local_sidereal_time, RA);
      SKYMAP_search_result_t result = SKYMAP_search_for_object(Hour_angle, dec, latitude);

      Az = result.azimuth;
      Alt = result.altitude;

      // Read magnetometer and accelerometer

      Serial.print("Now tracking: ");
      Serial.println(star->key);
      Serial.print("Azimuth: ");
      Serial.println(Az);
      Serial.print("Altitude: ");
      Serial.println(Alt);
      Serial.print("Heading: ");
      Serial.println(heading_filt);
      Serial.print("Tilt: ");
      Serial.println(pitch_filt);
      Serial.print("Degrees to Star: ");
      int deltaAz = Az - heading_filt;
      int deltaAlt = Alt - pitch_filt; 
      Serial.print(deltaAz);
      Serial.print(", ");
      Serial.println(deltaAlt);

      

      lcd.clear();

      //lcd.print("Now tracking: ");
      lcd.print(star->key);
      lcd.print(" Az,Alt");
      //lcd.print("Azimuth: ");
      lcd.setCursor(0, 1);
      lcd.print(Az);
      //lcd.print("Altitude: ");
      lcd.print(",");
      lcd.print(Alt);



      
    } else {
      Serial.println("No star is currently selected.");
    }

    Serial.println("-------------------");
  }

  
}

void read_MPU9250() {
  int16_t magX, magY, magZ;
  int16_t accX, accY, accZ;

  // Read magnetometer
  Wire.beginTransmission(AK8963_ADDRESS);
  Wire.write(0x03);
  Wire.endTransmission(false);
  Wire.requestFrom(AK8963_ADDRESS, 7);

  if (Wire.available() == 7) {
    uint8_t xlo = Wire.read();
    uint8_t xhi = Wire.read();
    uint8_t ylo = Wire.read();
    uint8_t yhi = Wire.read();
    uint8_t zlo = Wire.read();
    uint8_t zhi = Wire.read();
    Wire.read(); // status (not used)

    magX = (int16_t)(xhi << 8 | xlo);
    magY = (int16_t)(yhi << 8 | ylo);
    magZ = (int16_t)(zhi << 8 | zlo);

    if (calibrating) {
      if (millis() - calib_start_time < calib_duration) {

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Calibrating...");
        lcd.setCursor(0, 1);
        lcd.print("MPU9250 MAG");

        for (int i = 0; i < 3; i++) {
          if (magX > mag_max[0]) mag_max[0] = magX;
          if (magY > mag_max[1]) mag_max[1] = magY;
          if (magZ > mag_max[2]) mag_max[2] = magZ;
          if (magX < mag_min[0]) mag_min[0] = magX;
          if (magY < mag_min[1]) mag_min[1] = magY;
          if (magZ < mag_min[2]) mag_min[2] = magZ;
        }
      } else {
        for (int i = 0; i < 3; i++) {
          mag_offset[i] = (mag_max[i] + mag_min[i]) / 2.0;
          mag_scale[i] = (mag_max[i] - mag_min[i]) / 2.0;
        }
        calibrating = false;
        Serial.println("Calibration complete!");
      }
    } else {
      magX -= mag_offset[0];
      magY -= mag_offset[1];
      magZ -= mag_offset[2];

      magX_filt = alpha * magX + (1 - alpha) * magX_filt;
      magY_filt = alpha * magY + (1 - alpha) * magY_filt;
      magZ_filt = alpha * magZ + (1 - alpha) * magZ_filt;

      float heading = atan2(magY_filt, magX_filt) * 180.0 / PI;
      if (heading < 0) heading += 360.0;
      heading_filt = alpha * heading + (1.0 - alpha) * heading_filt;

      // Read accelerometer (fast method: only accX, accY, accZ)
      Wire.beginTransmission(MPU9250_ADDRESS);
      Wire.write(0x3B);
      Wire.endTransmission(false);
      Wire.requestFrom(MPU9250_ADDRESS, 6);

      accX = Wire.read() << 8 | Wire.read();
      accY = Wire.read() << 8 | Wire.read();
      accZ = Wire.read() << 8 | Wire.read();

      float pitch = atan2((float)accY, (float)accZ) * 180.0 / PI;
      pitch_filt = alpha * pitch + (1.0 - alpha) * pitch_filt;
    }
  }
}
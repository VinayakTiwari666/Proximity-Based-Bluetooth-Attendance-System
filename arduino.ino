 #include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
const char* AUTHORIZED_DEVICE="D4C";
const int RSSI_THRESHOLD=-75;
const unsigned long ABSENCE_TIMEOUT=10000;
const unsigned long SCAN_DURATION=1;
BLEScan* pBLEScan;
bool isPresent=false;
unsigned long arrivalTime=0;
unsigned long lastSeenTime=0;
void setup(){
Serial.begin(115200);
delay(1000);
BLEDevice::init("");
pBLEScan=BLEDevice::getScan();
pBLEScan->setActiveScan(true);
pBLEScan->setInterval(100);
pBLEScan->setWindow(99);
Serial.println("SYSTEM:READY");
}
void loop(){
BLEScanResults foundDevices=pBLEScan->start(SCAN_DURATION,false);
bool authorizedDeviceDetected=false;
int detectedRSSI=0;
for(int i=0;i<foundDevices.getCount();i++){
BLEAdvertisedDevice device=foundDevices.getDevice(i);
if(device.haveName()&&device.getName()==AUTHORIZED_DEVICE){
int rssi=device.getRSSI();
if(rssi>=RSSI_THRESHOLD){
authorizedDeviceDetected=true;
detectedRSSI=rssi;
break;
}
}
}
pBLEScan->clearResults();
unsigned long currentTime=millis();
if(authorizedDeviceDetected){
lastSeenTime=currentTime;
Serial.print("RSSI:");
Serial.println(detectedRSSI);
Serial.print("LAST_SEEN:");
Serial.println(currentTime/1000);
if(!isPresent){
isPresent=true;
arrivalTime=currentTime;
Serial.println("ATTENDANCE:PRESENT");
Serial.print("ARRIVAL:");
Serial.println(arrivalTime/1000);
Serial.println("EVENT:ARRIVAL");
}
}
if(isPresent&&currentTime-lastSeenTime>=ABSENCE_TIMEOUT){
isPresent=false;
unsigned long duration=(currentTime-arrivalTime)/1000;
Serial.println("ATTENDANCE:ABSENT");
Serial.print("DURATION:");
Serial.println(duration);
Serial.print("DEPARTURE:");
Serial.println(currentTime/1000);
Serial.println("EVENT:DEPARTURE");
}
delay(100);
}

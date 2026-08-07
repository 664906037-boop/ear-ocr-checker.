# EAR OCR Engine V1

โปรเจกต์นี้มีเป้าหมายเดียว: อ่าน 3 ค่าในใบ EAR ให้ถูกก่อนนำกลับไปเชื่อม Web App

- CONTAINER NUMBER
- SEAL NO
- BOOKING

## วิธีทำงาน

1. ขยายภาพต้นฉบับใน Browser
2. OCR รอบแรกเพื่อหาตำแหน่งหัวข้อ CONTAINER / SEAL / BOOKING
3. Crop เฉพาะบริเวณทางขวาของหัวข้อ
4. ขยาย Crop อีกครั้ง
5. OCR รหัส A-Z และ 0-9 จำนวนหลาย pass
6. ใช้ voting เลือกค่าที่ OCR อ่านซ้ำตรงกันมากที่สุด
7. ถ้าหาหัวข้อไม่พบ จะใช้ fallback zone ที่จูนจากตัวอย่าง EAR ที่ให้มา
8. แสดง Crop จริงด้านล่างสำหรับ Debug

ไม่มี API เสียเงิน การประมวลผลเกิดใน Browser ผ่าน Tesseract.js + PDF.js

## วิธีใช้ผ่าน GitHub + Vercel

1. แตก ZIP
2. สร้าง GitHub repository ใหม่ เช่น `ear-ocr-engine-v1`
3. Upload ไฟล์ทั้งหมดจากโฟลเดอร์ที่แตก ZIP
4. Commit changes
5. เข้า Vercel > Add New > Project
6. Import repository `ear-ocr-engine-v1`
7. Framework Preset เลือก Other
8. Build Command / Output Directory / Install Command ปล่อยว่าง
9. Deploy
10. เปิด URL แล้วอัปโหลด EAR เพื่อทดสอบ

## วิธีทดสอบที่ถูกต้อง

อย่าเริ่มจากรูปเดียว ควรทดสอบอย่างน้อย 10 รูปและจดผล:

| File | Container | Seal | Booking |
|---|---|---|---|
| EAR01 | ถูก/ผิด | ถูก/ผิด | ถูก/ผิด |

หากอ่านผิด ให้เปิดส่วน `DEBUG / CALIBRATION` แล้วดู Crop ของช่องนั้น

- Crop ถูกตำแหน่ง แต่ OCR ผิด = ปัญหาความคมชัด / preprocessing
- Crop ผิดตำแหน่ง = ปรับระบบ locate/fallback zone
- Crop ไม่มีข้อมูลเพราะวัตถุบัง = OCR ไม่มีทางอ่านตัวอักษรที่มองไม่เห็น ต้องใช้ข้อมูลจากตำแหน่งอื่นหรือถ่ายภาพใหม่

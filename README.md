# V16.1 Bug Fix

แก้ข้อผิดพลาด `sharpenCanvas is not defined` โดยเพิ่มฟังก์ชัน sharpen ที่ขาดหายไปใน `app.js`

# EAR Vehicle Checker — Auto Compare V16

V16 คือเวอร์ชันใช้งานประจำจาก OCR Engine V15

## การใช้งานปกติ

1. เลือก `ข้อมูล 1 — ใบ EAR`
2. เลือก `ข้อมูล 2 — แบบฟอร์มควบคุมรถ`
3. กด `เริ่มอ่านและเปรียบเทียบ`
4. ระบบอ่านอัตโนมัติ 3 ค่า:
   - CONTAINER NUMBER
   - SEAL NO
   - BOOKING
5. ระบบแสดง:
   - ตรงกัน
   - ตรงกันหลังแก้ OCR
   - OCR ไม่ชัวร์
   - ไม่ตรงกัน
6. ถ้าทั้ง 3 ผ่าน จะขึ้น `ผ่านการตรวจสอบ`

## สิ่งที่ต่างจาก V15

V15 ต้องกำหนดกรอบ Calibration ในครั้งแรก

V16 ฝังกรอบมาตรฐานของเอกสาร 2 แบบไว้แล้ว:
- File 1: EAR
- File 2: Vehicle Control Form

ดังนั้นผู้ใช้ไม่ต้องลากกรอบทุกครั้ง

ปุ่ม `ปรับกรอบขั้นสูง` ยังมีไว้เป็น fallback เฉพาะกรณี:
- รูปถูก Crop ไม่เหมือนปกติ
- เอกสารถ่ายเอียงมาก
- Layout แบบฟอร์มเปลี่ยน
- OCR อ่านไม่ตรงตำแหน่ง

เมื่อบันทึกกรอบขั้นสูง ระบบจะจำใน Browser และใช้แทนค่า Default

## หมายเหตุเรื่องความแม่นยำ

เพื่อให้ Auto ROI ทำงานดีที่สุด:
- ถ่ายให้เห็นเอกสารทั้งแผ่น
- อย่า Crop เฉพาะบางส่วนก่อน Upload
- พยายามให้กล้องตั้งฉากกับกระดาษ
- ใช้ไฟล์ต้นฉบับจากกล้อง ถ้าเป็นไปได้
- หลีกเลี่ยง Screenshot หรือภาพที่ถูกบีบอัดหลายรอบ

## GitHub + Vercel

1. แตก ZIP
2. Upload ไฟล์ทั้ง 5 ขึ้น GitHub:
   - index.html
   - app.js
   - styles.css
   - vercel.json
   - README.md
3. Commit changes
4. Vercel จะ Deploy อัตโนมัติถ้า Repository เดิมเชื่อมอยู่แล้ว
5. ถ้าเป็น Repository ใหม่:
   - Vercel > Add New > Project
   - Import GitHub repository
   - Framework Preset = Other
   - Build Command = ว่าง
   - Output Directory = ว่าง
   - Install Command = ว่าง
   - Deploy
